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
  return n.toFixed(1).replace(".", ",");
}

const N_STAP = 0.1;
const N_MIN = 0;
const N_MAX = 2.5;
const N_TERMEN = Array.from({ length: 26 }, (_, i) => Math.round(i * 10) / 100);

// ─── Maximum punten wijzigen (herbruikbaar formulier) ─────────────────────────

function WijzigMaxPuntenForm({
  huidigeMax,
  onWijzig,
}: {
  huidigeMax: number;
  onWijzig: (nieuw: number) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(values: { maxPunten: string }) {
    const nieuw = parseInt(values.maxPunten, 10);
    if (!values.maxPunten.trim() || isNaN(nieuw) || nieuw <= 0 || nieuw > 500) {
      setError("Voer een geheel getal in tussen 1 en 500");
      return;
    }
    onWijzig(nieuw);
    showToast({
      style: Toast.Style.Success,
      title: `Maximum punten: ${nieuw}`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Maximum punten wijzigen"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Wijzig Maximum"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="maxPunten"
        title="Maximum punten (L)"
        placeholder="bijv. 75"
        defaultValue={String(huidigeMax)}
        info="Het maximaal te behalen aantal scorepunten op de toets"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

// ─── Modus 1: punten → cijfer (voor één N-term) ───────────────────────────────

function TabelNterm({
  maxPunten: startMaxPunten,
  nTerm: startNTerm,
}: {
  maxPunten: number;
  nTerm: number;
}) {
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
    const csv =
      "Punten,Cijfer\n" +
      rijen.map((r) => `${r.punten},${fmt(r.cijfer)}`).join("\n");
    await Clipboard.copy(csv);
    await showHUD("Tabel gekopieerd als CSV");
  }

  return (
    <List
      navigationTitle={`Punten → Cijfer  |  N = ${fmt(nTerm)}  |  max = ${maxPunten} pt`}
      searchBarPlaceholder="Typ een aantal punten om ernaartoe te springen…"
      filtering={false}
      onSearchTextChange={springNaarPunten}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={setSelectedId}
    >
      <List.Section title="Sneltoetsen">
        <List.Item
          id="nterm-hint"
          icon={Icon.Keyboard}
          title="Gebruik ⇧⌘↑ / ⇧⌘↓ om de N-term te wijzigen"
          actions={
            <ActionPanel>
              <Action.Push
                title="Wijzig Maximum Punten"
                icon={Icon.Pencil}
                target={
                  <WijzigMaxPuntenForm
                    huidigeMax={maxPunten}
                    onWijzig={setMaxPunten}
                  />
                }
              />
              <Action
                title="Verhoog N-Term"
                icon={Icon.ArrowUpCircleFilled}
                // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                onAction={verhoogNTerm}
              />
              <Action
                title="Verlaag N-Term"
                icon={Icon.ArrowDownCircleFilled}
                // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                onAction={verlaagNTerm}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section
        title={`N-term: ${fmt(nTerm)}  ·  Maximum: ${maxPunten} punten`}
      >
        {rijen.map(({ punten, cijfer }) => {
          return (
            <List.Item
              key={punten}
              id={String(punten)}
              icon={{ source: Icon.Circle, tintColor: gradeColor(cijfer) }}
              title={`${punten} punt${punten !== 1 ? "en" : ""}`}
              accessories={[
                { tag: { value: fmt(cijfer), color: gradeColor(cijfer) } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Kopieer Tabel Als CSV"
                      icon={Icon.CopyClipboard}
                      onAction={kopieerCSV}
                    />
                    <Action.CopyToClipboard
                      title="Kopieer Dit Cijfer"
                      content={fmt(cijfer)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="N-term aanpassen">
                    <Action
                      title="Verhoog N-Term"
                      icon={Icon.ArrowUpCircleFilled}
                      // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={verhoogNTerm}
                    />
                    <Action
                      title="Verlaag N-Term"
                      icon={Icon.ArrowDownCircleFilled}
                      // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "arrowDown",
                      }}
                      onAction={verlaagNTerm}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Maximum aanpassen">
                    <Action.Push
                      title="Wijzig Maximum Punten"
                      icon={Icon.Pencil}
                      target={
                        <WijzigMaxPuntenForm
                          huidigeMax={maxPunten}
                          onWijzig={setMaxPunten}
                        />
                      }
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
    const doel = N_TERMEN.reduce((dichtsbij, n) =>
      Math.abs(n - getal) < Math.abs(dichtsbij - getal) ? n : dichtsbij,
    );
    setSelectedId(fmt(doel));
  }

  function verhoogPunten() {
    const nieuw = Math.min(maxPunten, behaaldePunten + 1);
    setBehaaldePunten(nieuw);
    showToast({ style: Toast.Style.Success, title: `Punten: ${nieuw}` });
  }
  function verlaagPunten() {
    const nieuw = Math.max(0, behaaldePunten - 1);
    setBehaaldePunten(nieuw);
    showToast({ style: Toast.Style.Success, title: `Punten: ${nieuw}` });
  }

  const rijen = N_TERMEN.map((n) => ({
    nTerm: n,
    cijfer: berekenCijfer(behaaldePunten, maxPunten, n),
  }));

  async function kopieerCSV() {
    const csv =
      "N-term,Cijfer\n" +
      rijen.map((r) => `${fmt(r.nTerm)},${fmt(r.cijfer)}`).join("\n");
    await Clipboard.copy(csv);
    await showHUD("Tabel gekopieerd als CSV");
  }

  const pct = Math.round((behaaldePunten / maxPunten) * 100);

  return (
    <List
      navigationTitle={`N-term → Cijfer  |  S = ${behaaldePunten} / ${maxPunten}  (${pct}%)`}
      searchBarPlaceholder="Typ een N-term om ernaartoe te springen…"
      filtering={false}
      onSearchTextChange={springNaarNTerm}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={setSelectedId}
    >
      <List.Section title="Sneltoetsen">
        <List.Item
          id="punten-hint"
          icon={Icon.Keyboard}
          title="Gebruik ⇧⌘↑ / ⇧⌘↓ om de behaalde punten te wijzigen"
          actions={
            <ActionPanel>
              <Action.Push
                title="Wijzig Maximum Punten"
                icon={Icon.Pencil}
                target={
                  <WijzigMaxPuntenForm
                    huidigeMax={maxPunten}
                    onWijzig={wijzigMaxPunten}
                  />
                }
              />
              <Action
                title="Verhoog Punten"
                icon={Icon.ArrowUpCircleFilled}
                // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                onAction={verhoogPunten}
              />
              <Action
                title="Verlaag Punten"
                icon={Icon.ArrowDownCircleFilled}
                // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                onAction={verlaagPunten}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section
        title={`Score: ${behaaldePunten} van ${maxPunten} punten  (${pct}%)`}
      >
        {rijen.map(({ nTerm, cijfer }) => {
          return (
            <List.Item
              key={fmt(nTerm)}
              id={fmt(nTerm)}
              icon={{ source: Icon.Circle, tintColor: gradeColor(cijfer) }}
              title={`N = ${fmt(nTerm)}`}
              accessories={[
                { tag: { value: fmt(cijfer), color: gradeColor(cijfer) } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Kopieer Tabel Als CSV"
                      icon={Icon.CopyClipboard}
                      onAction={kopieerCSV}
                    />
                    <Action.CopyToClipboard
                      title="Kopieer Dit Cijfer"
                      content={fmt(cijfer)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Punten aanpassen">
                    <Action
                      title="Verhoog Punten"
                      icon={Icon.ArrowUpCircleFilled}
                      // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={verhoogPunten}
                    />
                    <Action
                      title="Verlaag Punten"
                      icon={Icon.ArrowDownCircleFilled}
                      // eslint-disable-next-line @raycast/prefer-common-shortcut -- Common.MoveUp/MoveDown broke this shortcut in testing
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "arrowDown",
                      }}
                      onAction={verlaagPunten}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Maximum aanpassen">
                    <Action.Push
                      title="Wijzig Maximum Punten"
                      icon={Icon.Pencil}
                      target={
                        <WijzigMaxPuntenForm
                          huidigeMax={maxPunten}
                          onWijzig={wijzigMaxPunten}
                        />
                      }
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

  const nTermOpties = N_TERMEN.map((n) => (
    <Form.Dropdown.Item key={fmt(n)} value={String(n)} title={fmt(n)} />
  ));

  // Beide velden zijn altijd gerenderd om navigatieproblemen met conditionele
  // rendering in Raycast te vermijden. handleSubmit leest values.modus om te
  // bepalen welk veld relevant is.
  function handleSubmit(values: {
    maxPunten: string;
    modus: string;
    nTerm: string;
    behaaldePunten: string;
  }) {
    const max = parseInt(values.maxPunten, 10);
    if (!values.maxPunten.trim() || isNaN(max) || max <= 0 || max > 500) {
      setMaxPuntenError("Voer een geheel getal in tussen 1 en 500");
      return;
    }

    if (values.modus === "nterm") {
      const n = parseFloat(values.nTerm);
      push(<TabelNterm maxPunten={max} nTerm={n} />);
    } else {
      const p = parseInt(values.behaaldePunten, 10);
      if (!values.behaaldePunten?.trim() || isNaN(p) || p < 0 || p > max) {
        setPuntenError(`Voer een geheel getal in tussen 0 en ${max}`);
        return;
      }
      setPuntenError(undefined);
      push(<TabelPunten maxPunten={max} behaaldePunten={p} />);
    }
  }

  return (
    <Form
      navigationTitle="N-term Cijfercalculator"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Genereer Tabel"
            icon={Icon.List}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="maxPunten"
        title="Maximum punten"
        placeholder="bijv. 75"
        defaultValue="100"
        info="Het maximaal te behalen aantal scorepunten op de toets"
        error={maxPuntenError}
        onChange={() => setMaxPuntenError(undefined)}
      />

      <Form.Dropdown
        id="modus"
        title="Tabeltype"
        defaultValue="nterm"
        info="Kies wat je wilt invullen"
        onChange={() => {
          setMaxPuntenError(undefined);
          setPuntenError(undefined);
        }}
      >
        <Form.Dropdown.Item
          value="nterm"
          title="Kies een N-term → tabel met alle punten en cijfers"
        />
        <Form.Dropdown.Item
          value="punten"
          title="Voer behaalde punten in → tabel met alle N-termen en cijfers"
        />
      </Form.Dropdown>

      <Form.Separator />

      {/* N-term: alleen relevant bij modus "nterm" */}
      <Form.Dropdown
        id="nTerm"
        title="N-term"
        defaultValue="1"
        info="Gebruikt bij tabeltype 'Kies een N-term' · < 1 = strenger, 1 = standaard, > 1 = gunstiger"
      >
        {nTermOpties}
      </Form.Dropdown>

      {/* Behaalde punten: alleen relevant bij modus "punten" */}
      <Form.TextField
        id="behaaldePunten"
        title="Behaalde punten"
        placeholder="bijv. 35"
        defaultValue="50"
        info="Gebruikt bij tabeltype 'Voer behaalde punten in'"
        error={puntenError}
        onChange={() => setPuntenError(undefined)}
      />
    </Form>
  );
}
