import { ActionPanel, Action, Form, showToast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

interface GameYaw {
  game: string;
  yaw: number;
}

const GAME_YAWS: GameYaw[] = [
  { game: "Apex Legends", yaw: 0.022 },
  { game: "Battlefield 5", yaw: 0.022 },
  { game: "CS (1.6)", yaw: 0.022 },
  { game: "Destiny 2", yaw: 0.0066 },
  { game: "DOOM", yaw: 0.0439453125 },
  { game: "Fortnite", yaw: 0.5715 },
  { game: "Overwatch", yaw: 0.0066 },
  { game: "Overwatch 2", yaw: 0.006666 },
  { game: "PUBG", yaw: 2.22222 },
  { game: "QCDE", yaw: 0.0439453125 },
  { game: "Q3 Arena", yaw: 0.022 },
  { game: "Quake", yaw: 0.022 },
  { game: "Quake Live", yaw: 0.02105 },
  { game: "Rainbow Six", yaw: 0.00572957795130823 },
  { game: "Reflex", yaw: 0.00572957795130823 },
  { game: "Siege", yaw: 0.00572957795130823 },
  { game: "Source (CS2, CSGO)", yaw: 0.022 },
  { game: "Unreal Tournament", yaw: 0.596 },
  { game: "VAL", yaw: 0.07 },
  { game: "Valorant", yaw: 0.07 },
];

function getGameYaw(gameName: string): number {
  const found = GAME_YAWS.find((g) => g.game === gameName);
  return found ? found.yaw : 0;
}

export default function SensitivityCalculator() {
  const [game, setGame] = useState<string>("");
  const [cm360, setCm360] = useState<string>("");
  const [dpi, setDpi] = useState<string>("");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    const cm = parseFloat(cm360);
    const dpiNum = parseInt(dpi);
    const yaw = getGameYaw(game);

    if (game && !isNaN(cm) && cm > 0 && !isNaN(dpiNum) && dpiNum > 0 && yaw > 0) {
      const countsPerRev = (cm / 2.54) * dpiNum;
      const inc = 360 / countsPerRev;
      const sensitivity = inc / yaw;
      setResult(sensitivity.toFixed(4));
    } else {
      setResult("");
    }
  }, [game, cm360, dpi]);

  const handleSubmit = () => {
    if (result) {
      Clipboard.copy(result);
      showToast({
        title: `Sensitivity for ${game}`,
        message: `${result} copied to clipboard`,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Result" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate the sens to perform a 360° turn" />

      <Form.Separator />

      <Form.Dropdown id="game" title="Game" value={game} onChange={setGame}>
        {GAME_YAWS.map((g) => (
          <Form.Dropdown.Item key={g.game} value={g.game} title={g.game} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="cm360" title="Target cm/360" placeholder="e.g., 30" value={cm360} onChange={setCm360} />

      <Form.TextField id="dpi" title="Mouse DPI" placeholder="e.g., 800" value={dpi} onChange={setDpi} />

      <>
        <Form.Separator />
        <Form.TextField id="result" title="Sensitivity Result" value={result} onChange={() => {}} />
      </>
    </Form>
  );
}
