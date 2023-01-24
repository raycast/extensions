import { useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { Values } from "./types";
import { ListScreen } from "./screens/ListScreen";
import { FromScreen } from "./screens/FormScreen";

export default function Command() {
  const { push } = useNavigation();
  const [tunnelParams, setTunnelParams] = useState<Partial<Values>>({});
  const shouldEstablish = useRef(true);

  const toCreate = () => {
    push(
      <FromScreen
        onSubmit={(values) => {
          setTunnelParams({ ...values });
        }}
        shouldEstablish={shouldEstablish}
      />
    );
  };

  return (
    <ListScreen
      defaultTunnelParams={tunnelParams}
      toCreate={toCreate}
      shouldEstablish={shouldEstablish}
      markUsed={() => {
        setTunnelParams({});
      }}
    />
  );
}
