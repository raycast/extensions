import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { veiculo } from "./generators/veiculo";

export default function Command() {
  const [mask, setMask] = useCachedState("mask", false);
  const [isLoading, setIsLoading] = useState(true);

  const [vehicle, setVehicle] = useState({
    placa: "",
    renavam: "",
    marca: "",
    modelo: "",
    tipo: "",
    ano: "",
    cor: "",
    combustivel: "",
    municipio: "",
    uf: "",
  });

  useEffect(() => {
    (async () => {
      const newVehicle = veiculo(true);
      setVehicle(newVehicle);
    })();
    setIsLoading(false);
  }, []);

  const actions = (content: string) => {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy" content={content} />
        <Action
          title="Generate New Vehicle"
          icon={Icon.Repeat}
          onAction={async () => {
            const newVehicle = veiculo(mask);
            setVehicle(newVehicle);
            setIsLoading(false);
          }}
        />
        <Action
          title="Toggle Mask"
          icon={Icon.Mask}
          onAction={() => {
            setMask(!mask);
          }}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      </ActionPanel>
    );
  };

  return (
    <>
      <List isLoading={isLoading}>
        <List.Section title="Vehicle">
          <List.Item
            title={mask ? vehicle.placa : vehicle.placa.replaceAll(/[^0-9A-Z]/g, "")}
            subtitle="License Plate"
            icon={Icon.BarCode}
            actions={actions(vehicle.placa)}
            keywords={["license plate", "placa"]}
          />
          <List.Item
            title={mask ? vehicle.renavam : vehicle.renavam.replaceAll(/\D/g, "")}
            subtitle="Renavam"
            actions={actions(vehicle.renavam)}
            icon={Icon.Receipt}
            keywords={["renavam", "registro"]}
          />
          <List.Item
            title={vehicle.marca}
            subtitle="Brand"
            actions={actions(vehicle.marca)}
            icon={Icon.Lowercase}
            keywords={["brand", "marca"]}
          />
          <List.Item
            title={vehicle.modelo}
            subtitle="Model"
            actions={actions(vehicle.modelo)}
            icon={vehicle.tipo === "Carro" ? Icon.Car : Icon.Bike}
            keywords={["model", "modelo"]}
          />
          <List.Item
            title={vehicle.tipo}
            subtitle="Type"
            actions={actions(vehicle.tipo)}
            icon={vehicle.tipo === "Carro" ? Icon.Car : Icon.Bike}
            keywords={["type", "tipo"]}
          />
          <List.Item
            title={vehicle.ano}
            subtitle="Year"
            actions={actions(vehicle.ano)}
            icon={Icon.Calendar}
            keywords={["year", "ano"]}
          />
          <List.Item
            title={vehicle.cor}
            subtitle="Color"
            actions={actions(vehicle.cor)}
            icon={Icon.EyeDropper}
            keywords={["color", "cor"]}
          />
          <List.Item
            title={vehicle.combustivel}
            subtitle="Fuel"
            actions={actions(vehicle.combustivel)}
            icon={Icon.Raindrop}
            keywords={["fuel", "combustível"]}
          />
          <List.Item
            title={vehicle.municipio}
            subtitle="City"
            actions={actions(vehicle.municipio)}
            icon={Icon.Pin}
            keywords={["city", "cidade"]}
          />
          <List.Item
            title={vehicle.uf}
            subtitle="State"
            actions={actions(vehicle.uf)}
            icon={Icon.AirplaneTakeoff}
            keywords={["state", "estado"]}
          />
        </List.Section>
      </List>
    </>
  );
}
