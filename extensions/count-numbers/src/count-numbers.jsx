import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";

function getImage(text) {
  text = text.toString();
  const img = (
    <svg viewBox={`0 0 300 700`} xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="50%"
        fill={environment.theme === "dark" ? "#fff" : "#000"}
        fontSize="200"
        fontFamily="-apple-system"
        textLength="700"
        lengthAdjust="spacing"
      >
        {text}
      </text>
    </svg>
  );
  return `"data:image/svg+xml,${encodeURIComponent(renderToString(img))}"`;
}

function renderText(text) {
  let image = getImage(text);
  return `<img height="300" width="700" src=${image} />`;
}

const defaultData = {
  counters: [{ id: 0, name: "Counter", count: 0, increment: 1, modulo: 1 }],
  currentCounter: 0,
};

function getCounter(data) {
  return data.counters.find((c) => c.id === data.currentCounter);
}

function getCount(data) {
  if (!data) return 0;
  return getCounter(data).count;
}

async function getData(key = "data", defaultValue = defaultData) {
  try {
    return JSON.parse(await LocalStorage.getItem(key));
  } catch {
    await writeData(defaultValue, key);
    return defaultValue;
  }
}

async function writeData(data, key = "data") {
  await LocalStorage.setItem(key, JSON.stringify(data));
}

export default function Command() {
  let [data, setData] = useState(null);

  const Settings = () => {
    const { pop } = useNavigation();
    const counter = getCounter(data);
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={(values) => {
                setData((data) => {
                  let newData = structuredClone(data);
                  let counter = getCounter(newData);
                  counter.name = values.name;
                  counter.count = parseInt(values.count) || 0;
                  counter.increment = parseInt(values.increment) || 1;
                  counter.modulo = parseInt(values.modulo) || 1;
                  return newData;
                });
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={counter.name} />
        <Form.TextField id="count" title="Count" defaultValue={counter.count.toString()} />
        <Form.TextField id="increment" title="Increment" defaultValue={counter.increment.toString()} />
        <Form.TextField id="modulo" title="Modulo" defaultValue={counter.modulo.toString()} />
      </Form>
    );
  };

  const SwitchCounter = () => {
    const { pop } = useNavigation();
    const dropdown = (
      <Form.Dropdown id="counter" title="Counter" defaultValue={data.currentCounter.toString()}>
        {data.counters.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id.toString()} title={c.name} />
        ))}
      </Form.Dropdown>
    );
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Switch"
              onSubmit={(values) => {
                setData((data) => {
                  let newData = structuredClone(data);
                  newData.currentCounter = parseInt(values.counter);
                  return newData;
                });
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        {dropdown}
      </Form>
    );
  };

  const CreateCounter = () => {
    const { pop } = useNavigation();
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create"
              onSubmit={(values) => {
                setData((data) => {
                  let newData = structuredClone(data);
                  const id = Math.max(...newData.counters.map((c) => c.id)) + 1;
                  newData.counters.push({
                    id: id,
                    name: values.name,
                    count: parseInt(values.count) || 0,
                    increment: parseInt(values.increment) || 1,
                    modulo: parseInt(values.modulo) || 1,
                  });
                  newData.currentCounter = id;
                  return newData;
                });
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={`Counter ${data.counters.length + 1}`} />
        <Form.TextField id="count" title="Count" defaultValue={"0"} />
        <Form.TextField id="increment" title="Increment" defaultValue={"1"} />
        <Form.TextField id="modulo" title="Modulo" defaultValue={"1"} />
      </Form>
    );
  };

  function incrementCount(reverse = false) {
    setData((data) => {
      let newData = structuredClone(data);
      let counter = getCounter(newData);
      let increment = !reverse ? counter.increment : -counter.increment;
      counter.count += increment;
      if (counter.modulo > 1) {
        counter.count %= counter.modulo;
      }
      return newData;
    });
  }

  function resetCounter() {
    setData((data) => {
      let newData = structuredClone(data);
      let counter = getCounter(newData);
      counter.count = 0;
      return newData;
    });
  }

  function deleteCounter() {
    if (data.counters.length === 1) {
      showToast(Toast.Style.Failure, "Cannot delete the only counter");
      return;
    }
    setData((data) => {
      let newData = structuredClone(data);
      const id = newData.currentCounter;
      const idx = newData.counters.findIndex((c) => c.id === id);
      newData.counters.splice(idx, 1);
      const newIdx = Math.min(idx, newData.counters.length - 1);
      newData.currentCounter = newData.counters[newIdx].id;
      return newData;
    });
  }

  useEffect(() => {
    (async () => {
      setData(await getData());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (data) {
        await writeData(data);
      }
    })();
  }, [data]);

  return (
    <Detail
      markdown={renderText(getCount(data))}
      actions={
        <ActionPanel>
          <Action icon={Icon.PlusCircle} title="Count" onAction={() => incrementCount()} />
          <Action.Push icon={Icon.Gear} title="Settings" target={<Settings />} />
          <Action
            icon={Icon.MinusCircle}
            title="Decrement Count"
            onAction={() => incrementCount(true)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Reset Counter"
            style={Action.Style.Destructive}
            onAction={() => resetCounter()}
          />
          <Action.Push
            icon={Icon.Switch}
            title="Switch Counter"
            target={<SwitchCounter />}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.Push
            icon={Icon.PlusTopRightSquare}
            title="Create Counter"
            target={<CreateCounter />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Counter"
            style={Action.Style.Destructive}
            onAction={() => deleteCounter()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
        </ActionPanel>
      }
    />
  );
}
