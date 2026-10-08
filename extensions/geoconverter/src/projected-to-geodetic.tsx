import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import GeodeticList from "./components/GeodeticList";

export default function Command() {
  const [projectionType, setProjectionType] = useState("mercator");
  const [x, setX] = useState("");
  const [y, setY] = useState("");

  const list = <GeodeticList projectionType={projectionType} x={x} y={y} />;

  const Actions = (
    <ActionPanel>
      <Action.Push title="Convert" target={list} />
    </ActionPanel>
  );

  return (
    <Form actions={Actions}>
      <Form.Dropdown id="projectionType" title="Projection System" value={projectionType} onChange={setProjectionType}>
        <Form.Dropdown.Item value="mercator" title="World Mercator" />
        <Form.Dropdown.Item value="webMercator" title="Pseudo Mercator" />
        <Form.Dropdown.Item value="utm" title="UTM Zone 33N" />
        <Form.Dropdown.Item value="lambert" title="Lambert Conic Conformal" />
        <Form.Dropdown.Item value="albers" title="Conus Albers" />
      </Form.Dropdown>
      <Form.TextField
        id="x"
        title="X Coordinate"
        value={x}
        onChange={setX}
        placeholder="Decimal value of X coordinate"
      />
      <Form.TextField
        id="y"
        title="Y Coordinate"
        value={y}
        onChange={setY}
        placeholder="Decimal value of Y coordinate"
      />
    </Form>
  );
}
