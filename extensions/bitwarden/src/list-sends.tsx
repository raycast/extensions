import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { Send, SendType } from "~/types/send";

const LoadingFallback = () => <List isLoading />;

const ListSendCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider unlock>
        <ListSendCommandContent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

const getItemAccessories = (send: Send): NonNullable<List.Item.Props["accessories"]> => {
  const accessories: NonNullable<List.Item.Props["accessories"]> = [];
  if (send.type === SendType.File) {
    accessories.push({ tag: { value: "File", color: Color.Orange }, icon: Icon.Document });
  } else {
    accessories.push({ tag: { value: "Text", color: Color.Blue }, icon: Icon.Text });
  }
  return accessories;
};

function ListSendCommandContent() {
  const bitwarden = useBitwarden();
  const { data, isLoading } = usePromise(() => bitwarden.listSends());

  const { result: sends = [] } = data ?? {};

  return (
    <List isLoading={isLoading}>
      {sends.map((send) => (
        <List.Item key={send.id} title={send.name} accessories={getItemAccessories(send)} />
      ))}
    </List>
  );
}

export default ListSendCommand;
