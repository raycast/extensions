import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { trpc } from "@/utils/trpc.util";
import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { sessionTokenAtom } from "@/states/session-token.state";
import { useAtom } from "jotai";

const Body = () => {
  const { data, isLoading } = trpc.user.me.useQuery();
  const { pop } = useNavigation();
  const [, setSessionToken] = useAtom(sessionTokenAtom);
  const utils = trpc.useUtils();

  return (
    // TODO: json 그대로 보여주고 있는 것을 예쁘게 보여주도록 수정 해야함.
    <Detail
      isLoading={isLoading}
      markdown={`
\`\`\` json
${JSON.stringify(data, null, 2)}
\`\`\`
      `}
      actions={
        <ActionPanel>
          <Action title={"Back"} icon="↩️" onAction={pop} />
          <Action
            title={"Sign Out"}
            icon="📴"
            onAction={() => {
              utils.user.me.reset();
              utils.user.me.invalidate();
              setSessionToken("");
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
};

export default function MyAccount() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
