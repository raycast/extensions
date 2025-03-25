import { ActionPanel, List, Action, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useMemo } from "react";
import { Opcode, getOpcodesForHF } from "@ethereumjs/evm/src/opcodes";
import { getActivePrecompiles } from "@ethereumjs/evm/src/precompiles";
import { Common, Chain } from "@ethereumjs/common";
import { HARDFORK_ICONS, PRECOMPILE_NAMES, getOpIcon } from "./utils";

export default function Command() {
  const common = useMemo(() => {
    const hardfork = getPreferenceValues<{ hardfork: string }>().hardfork;
    return new Common({
      chain: Chain.Mainnet,
      hardfork: hardfork,
    });
  }, []);

  const opcodes = useMemo(() => {
    const opcodes = [];
    const iter = getOpcodesForHF(common).opcodes.values();

    let op;
    while (!(op = iter.next()).done) opcodes.push(op.value);

    return opcodes;
  }, [common]);

  const precompiles = useMemo(() => {
    const pcs = [];
    const iter = getActivePrecompiles(common).keys();

    let pc;
    while (!(pc = iter.next()).done) pcs.push(pc.value);

    return pcs;
  }, [common]);

  return (
    <List>
      <List.Item
        icon={HARDFORK_ICONS[common.hardfork()]}
        title={`HARDFORK: ${common.hardfork()} | ${opcodes && Object.keys(opcodes).length} opcodes`}
        actions={
          <ActionPanel>
            <Action title={"Select Hardfork"} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
      {precompiles.map((pc: string) => {
        const address = parseInt(pc);
        const hex = `0x${address.toString(16).padStart(2, "0")}`;
        return (
          <List.Item
            icon="🅿️"
            key={`PC-${address}`}
            title={`[${hex}] ${PRECOMPILE_NAMES[address - 1]}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://evm.codes/precompiled#${hex}?fork=${common.hardfork()}`} />
              </ActionPanel>
            }
          />
        );
      })}
      {Object.values(opcodes).map((op: Opcode) => {
        const padded = op.code.toString(16).padStart(2, "0");
        return (
          <List.Item
            icon={getOpIcon(op) || "list-icon.png"}
            key={`OP-${op.code}`}
            title={`[0x${padded}] ${op.fullName}`}
            accessories={[{ text: `${op.fee}${op.dynamicGas ? " + dynamic" : ""} gas` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://evm.codes/#${padded}?fork=${common.hardfork()}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
