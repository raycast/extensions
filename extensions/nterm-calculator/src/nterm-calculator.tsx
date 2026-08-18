/**
 * N-term Cijfercalculator — Raycast extension
 *
 * Twee modi:
 *   1. N-term kiezen  → tabel: punten (0…max) × cijfer
 *   2. Punten invoeren → tabel: N-term (0,0…2,5) × cijfer
 *
 * Berekening volgens https://nl.wikipedia.org/wiki/N-term:
 *   Hoofdrelatie:    C = 9·(S/L) + N
 *   Grensrelatie 1:  C = 1 + S·(9/L)·2
 *   Grensrelatie 2:  C = 1 + S·(9/L)·0,5
 *   Grensrelatie 3:  C = 10 − (L−S)·(9/L)·2
 *   Grensrelatie 4:  C = 10 − (L−S)·(9/L)·0,5
 * Bij N > 1 geldt het laagste cijfer uit hoofdrelatie, grensrelatie 1 en 4.
 * Bij N < 1 geldt het hoogste cijfer uit hoofdrelatie, grensrelatie 2 en 3.
 * Resultaat wordt afgerond op 1 decimaal en begrensd op [1,0 ; 10,0].
 */

import {
  Form,
  List,
  ActionPanel,
  Action,
  useNavigation,
  Clipboard,
  showHUD,
  showToast,
  Toast,
  Color,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useState } from "react";

// ─── Berekening ───────────────────────────────────────────────────────────────

function berekenCijfer(S: number, L: number, N: number): number {
  const hoofdrelatie = (9 * S) / L + N;

  let C: number;
  if (N > 1) {
    const grensrelatie1 = 1 + S * (9 / L) * 2;
    const grensrelatie4 = 10 - (L - S) * (9 / L) * 0.5;
    C = Math.min(hoofdrelatie, grensrelatie1, grensrelatie4);
  } else if (N < 1) {
    const grensrelatie2 = 1 + S * (9 / L) * 0.5;
    const grensrelatie3 = 10 - (L - S) * (9 / L) * 2;
    C = Math.max(hoofdrelatie, grensrelatie2, grensrelatie3);
  } else {
    C = hoofdrelatie;
  }

  const afgerond = Math.round(C * 10) / 10;
  return Math.max(1.0, Math.min(10.0, afgerond));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(cijfer: number): Color {
  if (cijfer >= 5.5) return Color.Green;
  if (cijfer >= 4.5) return Color.Orange;
  return Color.Red;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

// Strikt: wijst "75.5" en "75abc" af in plaats van ze stilzwijgend af te kappen tot 75.
function parseGeheelGetal(tekst: string): number | null {
  const getrimd = tekst.trim();
  if (!/^\d+$/.test(getrimd)) return null;
  return parseInt(getrimd, 10);
}

const N_STAP = 0.1;
const N_MIN = 0;
const N_MAX = 2.5;
const N_TERMEN = Array.from({ length: 26 }, (_, i) => Math.round(i * 10) / 100);

// ─── Maximum punten wijzigen (herbruikbaar formulier) ─────────────────────────

function WijzigMaxPuntenForm({ huidigeMax, onWijzig }: { huidigeMax: number; onWijzig: (nieuw: number) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(values: { maxPunten: string }) {
    const nieuw = parseGeheelGetal(values.maxPunten);
    if (nieuw === null || nieuw <= 0 || nieuw > 500) {
      setError("Enter a whole number between 1 and 500");
      return;
    }
    onWijzig(nieuw);
    showToast({
      style: Toast.Style.Success,
      title: `Maximum Points: ${nieuw}`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Change Maximum Points"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Maximum" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="maxPunten"
        title="Maximum Points"
        placeholder="e.g. 75"
        defaultValue={String(huidigeMax)}
        info="The maximum achievable score points on the exam"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

// ─── Modus 1: punten → cijfer (voor één N-term) ───────────────────────────────

function TabelNterm({ maxPunten: startMaxPunten, nTerm: startNTerm }: { maxPunten: number; nTerm: number }) {
  const [maxPunten, setMaxPunten] = useState(startMaxPunten);
  const [nTerm, setNTerm] = useState(startNTerm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function springNaarPunten(tekst: string) {
    if (!tekst.trim()) return;
    const getal = parseInt(tekst.replace(/[^0-9]/g, ""), 10);
    if (isNaN(getal)) return;
    const doel = Math.max(0, Math.min(maxPunten, getal));
    setSelectedId(String(doel));
  }

  function verhoogNTerm() {
    const nieuw = Math.min(N_MAX, Math.round((nTerm + N_STAP) * 10) / 10);
    setNTerm(nieuw);
    showToast({ style: Toast.Style.Success, title: `N-term: ${fmt(nieuw)}` });
  }
  function verlaagNTerm() {
    const nieuw = Math.max(N_MIN, Math.round((nTerm - N_STAP) * 10) / 10);
    setNTerm(nieuw);
    showToast({ style: Toast.Style.Success, title: `N-term: ${fmt(nieuw)}` });
  }

  const rijen = Array.from({ length: maxPunten + 1 }, (_, i) => ({
    punten: i,
    cijfer: berekenCijfer(i, maxPunten, nTerm),
  }));

  async function kopieerCSV() {
    const csv = "Points,Grade\n" + rijen.map((r) => `${r.punten},${fmt(r.cijfer)}`).join("\n");
    await Clipboard.copy(csv);
    await showHUD("Table copied as CSV");
  }

  return (
    <List
      navigationTitle={`Points → Grade  |  N = ${fmt(nTerm)}  |  max = ${maxPunten} pt`}
      searchBarPlaceholder="Type a number of points to jump to…"
      filtering={false}
      onSearchTextChange={springNaarPunten}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={setSelectedId}
    >
      <List.Section title={`N-Term: ${fmt(nTerm)}  ·  Maximum: ${maxPunten} points`}>
        {rijen.map(({ punten, cijfer }) => {
          return (
            <List.Item
              key={punten}
              id={String(punten)}
              icon={{ source: Icon.Circle, tintColor: gradeColor(cijfer) }}
              title={`${punten} point${punten !== 1 ? "s" : ""}`}
              accessories={[{ tag: { value: fmt(cijfer), color: gradeColor(cijfer) } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Copy Table as CSV" icon={Icon.CopyClipboard} onAction={kopieerCSV} />
                    <Action.CopyToClipboard title="Copy This Grade" content={fmt(cijfer)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Adjust N-Term">
                    <Action
                      title="Increase N-Term"
                      icon={Icon.ArrowUpCircleFilled}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={verhoogNTerm}
                    />
                    <Action
                      title="Decrease N-Term"
                      icon={Icon.ArrowDownCircleFilled}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={verlaagNTerm}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Adjust Maximum">
                    <Action.Push
                      title="Change Maximum Points"
                      icon={Icon.Pencil}
                      target={<WijzigMaxPuntenForm huidigeMax={maxPunten} onWijzig={setMaxPunten} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// ─── Modus 2: N-term → cijfer (voor één behaalde score) ──────────────────────

function TabelPunten({
  maxPunten: startMaxPunten,
  behaaldePunten: startPunten,
}: {
  maxPunten: number;
  behaaldePunten: number;
}) {
  const [maxPunten, setMaxPuntenState] = useState(startMaxPunten);
  const [behaaldePunten, setBehaaldePunten] = useState(startPunten);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function wijzigMaxPunten(nieuw: number) {
    setMaxPuntenState(nieuw);
    setBehaaldePunten((p) => Math.min(p, nieuw));
  }

  function springNaarNTerm(tekst: string) {
    if (!tekst.trim()) return;
    const getal = parseFloat(tekst.replace(",", "."));
    if (isNaN(getal)) return;
    const doel = N_TERMEN.reduce((dichtsbij, n) => (Math.abs(n - getal) < Math.abs(dichtsbij - getal) ? n : dichtsbij));
    setSelectedId(fmt(doel));
  }

  function verhoogPunten() {
    const nieuw = Math.min(maxPunten, behaaldePunten + 1);
    setBehaaldePunten(nieuw);
    showToast({ style: Toast.Style.Success, title: `Points: ${nieuw}` });
  }
  function verlaagPunten() {
    const nieuw = Math.max(0, behaaldePunten - 1);
    setBehaaldePunten(nieuw);
    showToast({ style: Toast.Style.Success, title: `Points: ${nieuw}` });
  }

  const rijen = N_TERMEN.map((n) => ({
    nTerm: n,
    cijfer: berekenCijfer(behaaldePunten, maxPunten, n),
  }));

  async function kopieerCSV() {
    const csv = "N-Term,Grade\n" + rijen.map((r) => `${fmt(r.nTerm)},${fmt(r.cijfer)}`).join("\n");
    await Clipboard.copy(csv);
    await showHUD("Table copied as CSV");
  }

  const pct = Math.round((behaaldePunten / maxPunten) * 100);

  return (
    <List
      navigationTitle={`N-Term → Grade  |  S = ${behaaldePunten} / ${maxPunten}  (${pct}%)`}
      searchBarPlaceholder="Type an N-term to jump to…"
      filtering={false}
      onSearchTextChange={springNaarNTerm}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={setSelectedId}
    >
      <List.Section title={`Score: ${behaaldePunten} of ${maxPunten} points  (${pct}%)`}>
        {rijen.map(({ nTerm, cijfer }) => {
          return (
            <List.Item
              key={fmt(nTerm)}
              id={fmt(nTerm)}
              icon={{ source: Icon.Circle, tintColor: gradeColor(cijfer) }}
              title={`N = ${fmt(nTerm)}`}
              accessories={[{ tag: { value: fmt(cijfer), color: gradeColor(cijfer) } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Copy Table as CSV" icon={Icon.CopyClipboard} onAction={kopieerCSV} />
                    <Action.CopyToClipboard title="Copy This Grade" content={fmt(cijfer)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Adjust Points">
                    <Action
                      title="Increase Points"
                      icon={Icon.ArrowUpCircleFilled}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={verhoogPunten}
                    />
                    <Action
                      title="Decrease Points"
                      icon={Icon.ArrowDownCircleFilled}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={verlaagPunten}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Adjust Maximum">
                    <Action.Push
                      title="Change Maximum Points"
                      icon={Icon.Pencil}
                      target={<WijzigMaxPuntenForm huidigeMax={maxPunten} onWijzig={wijzigMaxPunten} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// ─── Formulier ────────────────────────────────────────────────────────────────

export default function Command() {
  const { push } = useNavigation();
  const [maxPuntenError, setMaxPuntenError] = useState<string | undefined>();
  const [puntenError, setPuntenError] = useState<string | undefined>();

  const nTermOpties = N_TERMEN.map((n) => <Form.Dropdown.Item key={fmt(n)} value={String(n)} title={fmt(n)} />);

  // Beide velden zijn altijd gerenderd om navigatieproblemen met conditionele
  // rendering in Raycast te vermijden. handleSubmit leest values.modus om te
  // bepalen welk veld relevant is.
  function handleSubmit(values: { maxPunten: string; modus: string; nTerm: string; behaaldePunten: string }) {
    const max = parseGeheelGetal(values.maxPunten);
    if (max === null || max <= 0 || max > 500) {
      setMaxPuntenError("Enter a whole number between 1 and 500");
      return;
    }

    if (values.modus === "nterm") {
      const n = parseFloat(values.nTerm);
      push(<TabelNterm maxPunten={max} nTerm={n} />);
    } else {
      const p = parseGeheelGetal(values.behaaldePunten);
      if (p === null || p < 0 || p > max) {
        setPuntenError(`Enter a whole number between 0 and ${max}`);
        return;
      }
      setPuntenError(undefined);
      push(<TabelPunten maxPunten={max} behaaldePunten={p} />);
    }
  }

  return (
    <Form
      navigationTitle="N-Term Grade Calculator"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Table" icon={Icon.List} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="maxPunten"
        title="Maximum Points"
        placeholder="e.g. 75"
        defaultValue="100"
        info="The maximum achievable score points on the exam"
        error={maxPuntenError}
        onChange={() => setMaxPuntenError(undefined)}
      />

      <Form.Dropdown
        id="modus"
        title="Table Type"
        defaultValue="nterm"
        info="Choose what to enter"
        onChange={() => {
          setMaxPuntenError(undefined);
          setPuntenError(undefined);
        }}
      >
        <Form.Dropdown.Item value="nterm" title="Choose an N-Term → table with all points and grades" />
        <Form.Dropdown.Item value="punten" title="Enter points scored → table with all N-terms and grades" />
      </Form.Dropdown>

      <Form.Separator />

      {/* N-term: alleen relevant bij modus "nterm" */}
      <Form.Dropdown
        id="nTerm"
        title="N-Term"
        defaultValue="1"
        info="Used with table type 'Choose an N-Term' · < 1 = stricter, 1 = standard, > 1 = more lenient"
      >
        {nTermOpties}
      </Form.Dropdown>

      {/* Behaalde punten: alleen relevant bij modus "punten" */}
      <Form.TextField
        id="behaaldePunten"
        title="Points Scored"
        placeholder="e.g. 35"
        defaultValue="50"
        info="Used with table type 'Enter points scored'"
        error={puntenError}
        onChange={() => setPuntenError(undefined)}
      />
    </Form>
  );
}
