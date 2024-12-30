import { parseOptions } from "../parseOptions";

it("works", () => {
  const result = parseOptions(
    "a100,a110 a200 option2:s200 option1:s100,s110",
    "arg10=a10,arg11=a11 arg20=a20 arg30=a30 key10:k10 key20:k20 option1:str10=s10,str11=s11,str12=s12 option2:str20=s20 option3:str30=s30",
  );
  const expected = {
    0: {
      arg10: "a100",
      arg11: "a110",
    },
    1: {
      arg20: "a200",
    },
    2: {
      arg30: "a30",
    },
    key10: "k10",
    key20: "k20",
    option1: {
      str10: "s100",
      str11: "s110",
      str12: "s12",
    },
    option2: {
      str20: "s200",
    },
    option3: {
      str30: "s30",
    },
  };
  expect(result).toEqual(expected);
});

it("empty string", () => {
  const result = parseOptions("", "key1:num1=1");
  const expected = {
    key1: {
      num1: "1",
    },
  };
  expect(result).toEqual(expected);
});

it("unknown key", () => {
  expect(() => parseOptions("a:1", "key:value")).toThrow(/unknown keys 'a'/i);
});
