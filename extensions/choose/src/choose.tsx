import { useEffect, useState } from "react";
import { connect, Socket } from "net";
import { Action, ActionPanel, closeMainWindow, List, PopToRootType, showToast } from "@raycast/api";

type Props = {
  arguments: {
    host: string;
    port: number;
  };
};

export default (props: Props) => {
  const [total, setTotal] = useState(1);
  const [items, setItems] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const {
    arguments: { host, port },
  } = props;

  useEffect(() => {
    const newSocket = connect({ host, port: +port }, () => {
      setItems([]);
      setTotal(1);
    });

    let buffer = "";
    let hasTotal = false;
    newSocket.on("data", (data) => {
      const chunk = data.toString();
      buffer += chunk;
      if (!buffer.includes("\n")) {
        return;
      }
      const new_items = buffer.split("\n");
      if (!hasTotal) {
        hasTotal = true;
        const newTotal = +new_items.shift()!;
        setTotal(newTotal);
        buffer = new_items.pop() || "";
        setItems(new_items);
      } else {
        buffer = new_items.pop() || "";
        setItems((prevItems) => prevItems.concat(new_items));
      }
    });

    newSocket.on("error", (err) => {
      showToast({ message: err.message, title: "Connection error occured" });
    });
    setSocket(newSocket);

    return () => {
      newSocket.end(() => {});
    };
  }, []);

  return (
    <List isLoading={items.length < total || !socket}>
      {items.map((item, idx) => (
        <List.Item
          key={idx}
          title={item}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => {
                  socket!.write(`${item}\n`);
                  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                }}
              ></Action>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
