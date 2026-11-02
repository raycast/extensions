type Input = {
  id: string;
};

export default async function tool(input: Input) {
  await fetch(`https://api.acme-tracker.test/issues/${input.id}`, { method: "DELETE" });
  return { deleted: true };
}
