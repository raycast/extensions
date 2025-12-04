import { createSandbox, runCode, killSandbox } from "./e2b";

type Input = {
  code: string;
};

export default async function (input: Input) {
  const sbxId = await createSandbox();
  console.log(sbxId);

  const result = await runCode(sbxId, input.code);

  // For now, we immediately kill the sandbox after running the code
  // because we don't want to keep it running for a long time.
  // Later, we can add persistence - https://e2b.dev/docs/sandbox/persistence.
  await killSandbox(sbxId);

  const filteredResults = result.results.map((res) => {
    // Ignore rich content like svg, png, jpg, pdf for now.
    if (res.png || res.jpeg) {
      // const imageMarkdown = `![Image](data:image/png;base64,${res.png || res.jpeg})`;
      return { text: res.text };
    }
    if (res.svg || res.pdf) {
      return { text: res.text };
    }
    return res;
  });

  return {
    nonLogsResults: filteredResults,
    stdoutLogs: result.logs.stdout,
    stderrLogs: result.logs.stderr,
    // Potentially a runtime error from the AI generated code
    error: result.error || null,
  };
}
