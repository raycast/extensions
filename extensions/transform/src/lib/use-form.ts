import { useEffect, useState } from "react";

export const useForm = ({
  transformDeps = [],
  transform,
}: {
  transformDeps?: unknown[];
  transform: (value: string) => Promise<string> | string;
}) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setOutput(await transform(input));
      } catch (err) {
        setOutput("Invalid input");
      }
    })();
  }, [input, ...transformDeps]);

  return {
    inputProps: { value: input, onChange: setInput, id: "input", title: "Input", autoFocus: true },
    outputProps: {
      value: output,
      id: "output",
      title: "Output",
      onChange: () => {
        //
      },
    },
  };
};
