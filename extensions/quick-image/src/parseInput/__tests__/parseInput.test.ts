import { parseInput } from "../parseInput";

it("cmd with pipe", () => {
  const inputs = parseInput(
    "cmd1 a b | cmd2",
    createGetOperation({
      cmd1: {
        format: "arg1=a1 arg2=a2",
      },
      cmd2: {},
    }),
  );
  expect(inputs[0]).toEqual({
    name: "cmd1",
    options: {
      0: { arg1: "a" },
      1: { arg2: "b" },
    },
    run: expect.anything(),
  });
  expect(inputs[1]).toEqual({
    name: "cmd2",
    options: {},
    run: expect.anything(),
  });
});

it("cmd not found", () => {
  expect(() => {
    parseInput("cmd1", createGetOperation({}));
  }).toThrow(/operation 'cmd1' not found/i);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createGetOperation(operations: Record<string, any>) {
  return function getOperation(name: string) {
    const operation = operations[name];
    if (!operation) {
      throw new Error(`Operation '${name}' not found`);
    }
    return {
      ...operation,
      run: async () => [],
    };
  };
}
