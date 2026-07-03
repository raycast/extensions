import { useEffect, useState } from "react";
import { connect, Socket } from "net";
import { Action, ActionPanel, closeMainWindow, List, PopToRootType } from "@raycast/api";

type Props = {
  arguments: {
    host: string;
    port: number;
  };
};

export default (props: Props) => {
  const {
    arguments: { host, port },
  } = props;
  const [total, setTotal] = useState(1);
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const newSocket = connect({ host, port: +port }, () => {
      console.log("Acquired socket!");
    });

    let buffer = "";
    let assignedTotal = false;
    newSocket.on("data", (data) => {
      const chunk = data.toString();
      buffer += chunk;
      if (!buffer.includes("\n")) {
        return;
      }
      const new_items = buffer.split("\n");
      console.log(buffer);
      if (!assignedTotal) {
        assignedTotal = true;
        const new_total = +new_items.shift()!;
        setTotal(new_total);
        console.log(`there are ${new_total} items in total!`);
      }
      buffer = new_items.pop() || "";
      setItems((prevItems) => prevItems.concat(new_items));
    });

    newSocket.on("error", (err) => {
      console.error(err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.end(() => {
        console.log("Shut down connection");
      });
    };
  }, []);

  if (!socket) {
    return <List isLoading={true} />;
  }

  return (
    <List isLoading={items.length < total}>
      {items.map((item, idx) => (
        <List.Item
          key={idx}
          title={item}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => {
                  socket.write(`${item}\n`);
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
