import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { parseWeek } from "./parse";
import { FoodResult } from "./types";

export default function Command() {
  const [mensaData, setMensaData] = useState<FoodResult>();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const mensaHTML = (
        await axios.get(
          `https://www.studentenwerk-oberfranken.de/essen/speiseplaene/hof/woche/${new Date().toISOString().split("T")[0]}.html`,
        )
      ).data;
      const data = parseWeek(mensaHTML);
      setSelectedDayIndex(
        data.days.findIndex((d) => d.date.toLocaleDateString() === new Date().toLocaleDateString()) ?? undefined,
      );
      setMensaData(data);
    })();
  }, []);

  return (
    <List
      isLoading={!mensaData}
      searchBarAccessory={
        <List.Dropdown
          storeValue={true}
          tooltip={"Tag"}
          placeholder={"Tag"}
          onChange={(i) => setSelectedDayIndex(parseInt(i))}
          isLoading={!mensaData}
        >
          {(mensaData?.days ?? []).map((d, index) => (
            <List.Dropdown.Item title={d.date.toLocaleDateString()} key={index} value={index.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {mensaData && selectedDayIndex !== undefined ? (
        <>
          {mensaData.days[selectedDayIndex!].mealTypes.map((mealType, index) => (
            <List.Section key={index} title={mealType.name}>
              {mensaData.days[selectedDayIndex!].mealTypes[index].meals.map((meal, mealIndex) => (
                <List.Item
                  key={mealIndex}
                  title={meal.name}
                  accessories={[
                    {
                      text: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
                        meal.prices[0],
                      ),
                    },
                  ]}
                />
              ))}
            </List.Section>
          ))}
        </>
      ) : (
        <List.EmptyView
          title={`Kein Tag gewählt! ${selectedDayIndex}`}
          description={"Wähle - sofern es heute Speisen gibt - einen Tag oben rechts aus!"}
        />
      )}
    </List>
  );
}
