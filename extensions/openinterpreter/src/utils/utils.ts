import { useState, useEffect } from "react";

function getRandomInteger(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useDebouncedState<T>(initialValue: T, delay: number): [T, (newValue: T) => void] {
  const [value, setValue] = useState(initialValue);
  const [outputValue, setOutputValue] = useState(initialValue);
  const [inputs, setInputs] = useState(0);
  let maxInputs = getRandomInteger(4, 9); // Random number from 4-9

  function doOutput(output: T) {
    setOutputValue(output);
    // setTimeout(() => {
    //   console.log("Sending page down");
    //   runAppleScript(END, {
    //     humanReadableOutput: false,
    //     parseOutput: (output) => console.log(output),
    //   });
    // }, 10);
  }

  useEffect(() => {
    if (inputs >= maxInputs) {
      maxInputs = getRandomInteger(4, 9);
      console.log("Max inputs reached, not debouncing");
      doOutput(value);
      setInputs(0);
    } else {
      const handler = setTimeout(() => {
        console.log(`Timeout reached, debouncing. Inputs: ${inputs}`);
        doOutput(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay, inputs, maxInputs]);

  return [
    outputValue,
    (newValue: T) => {
      setValue(newValue);
      setInputs((prevInputs) => prevInputs + 1);
    },
  ];
}
