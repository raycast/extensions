import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runPosJSON, type PosCommand } from "./lib/pos";
import { needsArgs, paletteCommands } from "./lib/palette";
import { runRegistryCommand } from "./lib/actions";

function ArgsForm({ cmd }: { cmd: PosCommand }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`pos ${cmd.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Command"
            icon={Icon.Play}
            onSubmit={async (values: { args: string }) => {
              await runRegistryCommand(cmd, values.args ?? "");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={cmd.name} text={cmd.synopsis} />
      <Form.TextField
        id="args"
        title="Arguments"
        placeholder={cmd.args}
        info={`e.g. ${cmd.example}`}
      />
    </Form>
  );
}

export default function Commands() {
  const { isLoading, data } = usePromise(() =>
    runPosJSON<PosCommand[]>(["help", "--json"]),
  );
  const cmds = paletteCommands(data ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Run a pos command…">
      {cmds.map((c) => (
        <List.Item
          key={c.name}
          title={c.name}
          subtitle={c.synopsis}
          accessories={c.args ? [{ tag: c.args }] : []}
          actions={
            <ActionPanel>
              {needsArgs(c) ? (
                <Action.Push
                  title="Enter Arguments…"
                  icon={Icon.Pencil}
                  target={<ArgsForm cmd={c} />}
                />
              ) : (
                <Action
                  title="Run"
                  icon={Icon.Play}
                  onAction={() => runRegistryCommand(c, "")}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
