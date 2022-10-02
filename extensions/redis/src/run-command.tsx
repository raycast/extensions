import { Action, ActionPanel, Detail, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
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
            onSubmit={(values) => {
              push(<RunCommand args={values.args} redisURL={redisURL} />);
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

const RunCommand = (props: { redisURL: string; args: string }) => {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [args, setArgs] = useState<string>("");

  const run = useCallback(
    async (text: string) => {
      const client = createClient({ url: props.redisURL });
      await client.connect();

      try {
        setLoading(true);

        const args = text
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
        setArgs(args.join(" "));
        const res = await client.sendCommand(args);
        setResult(res?.toString() ?? "");
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Run command failed",
          message: String(err),
        });
      } finally {
        setLoading(false);
        client.disconnect();
      }
    },
    [setResult, setLoading]
  );

  useEffect(() => {
    (async () => {
      await run(props.args);
    })();
  }, []);

  return (
    <Detail isLoading={loading} markdown={"Command:\n```\n" + args + "\n```\n" + "Result:\n```\n" + result + "\n```"} />
  );
};
