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

  console.log(`Listening on host ${host} with port ${port}...`);
  useEffect(() => {
    console.log("Started useEffect hook...");
    const newSocket = connect({ host, port: +port }, () => {
      console.log("Acquired socket!");
    });

    let buffer = "";
    let hasTotal = false;
    newSocket.on("data", (data) => {
      const chunk = data.toString();
      buffer += chunk;
      console.log(`Received chunk ${chunk}, current buffer ${buffer}...`);
      if (!buffer.includes("\n")) {
        return;
      }
      const new_items = buffer.split("\n");
      console.log(`New items are ${new_items}`);
      console.log(buffer);
      if (!hasTotal) {
        hasTotal = true;
        const newTotal = +new_items.shift()!;
        setTotal(newTotal);
        console.log(`there are ${newTotal} items in total!`);
      }
      buffer = new_items.pop() || "";
      console.log(`Current buffer is ${buffer}`);
      setItems((prevItems) => prevItems.concat(new_items));
    });

    newSocket.on("error", (err) => {
      console.log(err);
      showToast({ message: err.message, title: "Connection error occured" });
    });
    setSocket(newSocket);

    return () => {
      console.log("Called unmount");
      newSocket.end(() => {
        console.log("Closed connection socket");
      });
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
                  console.log(`Choosing ${item}...`);
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
