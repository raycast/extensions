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
        <Action.CopyToClipboard title="Copiar" content={content} />
        <Action
          title="Gerar Nova Empresa"
          icon={Icon.Repeat}
          onAction={async () => {
            const newVehicle = veiculo(mask);
            setVehicle(newVehicle);
            setIsLoading(false);
          }}
        />
        <Action
          title="Mudar Máscara"
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
        <List.Section title="Veículo">
          <List.Item
            title={mask ? vehicle.placa : vehicle.placa.replaceAll(/[^0-9A-Z]/g, "")}
            subtitle="Placa"
            icon={Icon.BarCode}
            actions={actions(vehicle.placa)}
          />
          <List.Item
            title={mask ? vehicle.renavam : vehicle.renavam.replaceAll(/\D/g, "")}
            subtitle="Renavam"
            actions={actions(vehicle.renavam)}
            icon={Icon.Receipt}
          />
          <List.Item title={vehicle.marca} subtitle="Marca" actions={actions(vehicle.marca)} icon={Icon.Lowercase} />
          <List.Item
            title={vehicle.modelo}
            subtitle="Modelo"
            actions={actions(vehicle.modelo)}
            icon={vehicle.tipo === "Carro" ? Icon.Car : Icon.Bike}
          />
          <List.Item
            title={vehicle.tipo}
            subtitle="Tipo"
            actions={actions(vehicle.tipo)}
            icon={vehicle.tipo === "Carro" ? Icon.Car : Icon.Bike}
          />
          <List.Item title={vehicle.ano} subtitle="Ano" actions={actions(vehicle.ano)} icon={Icon.Calendar} />
          <List.Item title={vehicle.cor} subtitle="Cor" actions={actions(vehicle.cor)} icon={Icon.EyeDropper} />
          <List.Item
            title={vehicle.combustivel}
            subtitle="Combustível"
            actions={actions(vehicle.combustivel)}
            icon={Icon.Raindrop}
          />
          <List.Item
            title={vehicle.municipio}
            subtitle="Município"
            actions={actions(vehicle.municipio)}
            icon={Icon.Pin}
          />
        </List.Section>
      </List>
    </>
  );
}
