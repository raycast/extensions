import { Form } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";

export function BaseConvertersSimpleView(props: {
  base10: string;
  base2: string;
  base4: string;
  base8: string;
  base16: string;
  base32: string;
  setBaseString: Dispatch<SetStateAction<string>>;
  setBaseRadix: Dispatch<SetStateAction<number>>;
}) {
  const { base10, base2, base4, base8, base16, base32, setBaseString, setBaseRadix } = props;
  return (
    <>
      <Form.TextField
        id={"base10"}
        title="10"
        value={base10}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(10);
        }}
      />
      <Form.TextField
        id={"base2"}
        title="2"
        value={base2}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(2);
        }}
      />
      <Form.TextField
        id={"base4"}
        title="4"
        value={base4}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(4);
        }}
      />
      <Form.TextField
        id={"base8"}
        title="8"
        value={base8}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(8);
        }}
      />
      <Form.TextField
        id={"base16"}
        title="16"
        value={base16}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(16);
        }}
      />
      <Form.TextField
        id={"base32"}
        title="32"
        value={base32}
        onChange={(newValue) => {
          setBaseString(newValue);
          setBaseRadix(32);
        }}
      />
    </>
  );
}
