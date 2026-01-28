import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "redis";

export default () => {
  const { push } = useNavigation();
  const [args, setArgs] = useState<string>("");

  const redisURL = generateRedisURL();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run"
            icon={Icon.Cloud}
            onSubmit={(values: { args: string }) => {
              const args = values.args
                .split("\n")
                .map((arg) => arg.trim())
                .filter((arg) => arg.length > 0);
              if (args.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Empty command",
                });
                return;
              }

              push(<RunCommand args={args} redisURL={redisURL} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Command"
        id="args"
        value={args}
        onChange={setArgs}
        placeholder="Split command args by a new line"
      />
    </Form>
  );
};

const generateRedisURL = () => {
  const pref = getPreferenceValues();
  let url = `redis://`;
  if (pref.username || pref.password) {
    if (pref.username) {
      url += `${pref.username}`;
    }
    if (pref.password) {
      url += `:${pref.password}`;
    }
    url += "@";
  }
  if (pref.host) {
    url += pref.host;
  }
  if (pref.port) {
    url += `:${pref.port}`;
  }
  if (pref.database) {
    url += `/${pref.database}`;
  }
  return url;
};

const RunCommand = (props: { redisURL: string; args: string[] }) => {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const client = createClient({ url: props.redisURL });
      try {
        setLoading(true);
        await client.connect();

        const res = await client.sendCommand(props.args);
        setResult(res?.toString() ?? "");
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Run command failed",
          message: String(err),
        });
      } finally {
        setLoading(false);
        if (client.isReady) {
          client.disconnect();
        }
      }
    })();
  }, []);

  return (
    <Detail
      isLoading={loading}
      markdown={"Command:\n```\n" + props.args.join(" ") + "\n```\n" + "Result:\n```\n" + result + "\n```"}
    />
  );
};
