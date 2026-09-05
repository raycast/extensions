import { registeredVMs, resolveVMQuery } from "../src/registered-vms";

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    throw new Error("usage: npx tsx scripts/open-vm.ts <vm-name-or-uuid>");
  }

  const vm = resolveVMQuery(await registeredVMs.snapshot(), query);
  const outcome = await registeredVMs.openOrSwitch(vm.id);
  process.stdout.write(
    JSON.stringify({
      action: outcome.action,
      id: outcome.vm.id,
      name: outcome.vm.name,
    }) + "\n",
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + "\n");
  process.exitCode = 1;
});
