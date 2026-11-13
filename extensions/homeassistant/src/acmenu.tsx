import { useVisibleHAStates } from "@components/hooks";
import { MenuBarSubmenu } from "@components/menu";
import { ACControls } from "@components/climate/menu";
import { climateLabel, climateTemperature, isAirConditioner, isClimateAvailable } from "@components/climate/utils";
import { acMenuCache } from "@lib/ac-menu";
import { ha } from "@lib/common";
import { useEntityOverrides } from "@lib/entity-overrides";
import { getDisplayName, getErrorMessage } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Color, environment, Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { useState } from "react";

function ACMenu({ onHide }: { onHide: () => void }) {
  const { states, error, isLoading } = useVisibleHAStates();
  const { entityAliases } = useEntityOverrides();
  const entities = states
    ?.filter(isAirConditioner)
    .sort((a, b) =>
      getDisplayName(a, entityAliases[a.entity_id]).localeCompare(getDisplayName(b, entityAliases[b.entity_id])),
    );
  const activeCount = entities?.filter((entity) => isClimateAvailable(entity) && entity.state !== "off").length ?? 0;
  let iconColor = activeCount > 0 ? Color.Blue : Color.SecondaryText;
  if (error) iconColor = Color.Orange;

  async function refresh() {
    try {
      if (entities?.length) {
        await ha.post("services/homeassistant/update_entity", {
          entity_id: entities.map((entity) => entity.entity_id),
        });
      }
      await launchCommand({ name: "acmenu", type: LaunchType.Background });
      await showHUD("AC refresh requested");
    } catch (error) {
      await showHUD(`Could not refresh ACs: ${getErrorMessage(error)}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{ source: "air-conditioner.svg", tintColor: iconColor }}
      title={activeCount > 0 ? `${activeCount}` : undefined}
      tooltip={
        error ? "ACs: connection failed" : `Air conditioners · ${activeCount} on · ${entities?.length ?? 0} total`
      }
      isLoading={isLoading}
    >
      {error && <MenuBarExtra.Item title="Cannot connect to Home Assistant" subtitle={getErrorMessage(error)} />}
      {!error && !isLoading && entities?.length === 0 && (
        <MenuBarExtra.Item
          title="No air conditioners found"
          subtitle="Add a climate entity with cooling support in Home Assistant"
        />
      )}
      {entities?.map((entity) => {
        const name = getDisplayName(entity, entityAliases[entity.entity_id]);
        const available = isClimateAvailable(entity) && !error;
        const status = available ? climateLabel(entity.state) : "Unavailable";
        const roomTemperature = climateTemperature(entity, entity.attributes.current_temperature);
        const targetTemperature = climateTemperature(entity, entity.attributes.temperature);
        const icon = {
          source: "air-conditioner.svg",
          tintColor: available && entity.state !== "off" ? Color.Blue : Color.SecondaryText,
        };
        return (
          <MenuBarSubmenu
            key={entity.entity_id}
            title={name}
            subtitle={available ? `${status} · ${roomTemperature}` : status}
            icon={icon}
          >
            {entity.area_name && <MenuBarExtra.Item title={entity.area_name} />}
            <MenuBarExtra.Item
              title={status}
              subtitle={`Room ${roomTemperature} · Set ${targetTemperature}`}
              icon={icon}
            />
            <ACControls state={entity} available={available} />
          </MenuBarSubmenu>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
        <RUIMenuBarExtra.ConfigureCommand />
        <MenuBarExtra.Item title="Hide AC Menu" icon={Icon.EyeDisabled} onAction={onHide} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function ACMenuCommand() {
  const [visible, setVisible] = useState(() => {
    if (environment.launchType === LaunchType.UserInitiated) {
      acMenuCache.set("visible", "true");
    }
    return acMenuCache.get("visible") === "true";
  });
  if (!visible) return null;
  return (
    <ACMenu
      onHide={() => {
        acMenuCache.set("visible", "false");
        setVisible(false);
      }}
    />
  );
}
