import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useState } from "react";

type Result = {
  title: string;
  icon?: Image.ImageLike | null;
  output?: string | null;
};

export default function Query() {
  const [results, setResults] = useState<Result[]>([]);
  return (
    <List searchBarPlaceholder="Enter a query..." onSearchTextChange={(text) => parseQuery(text, setResults)}>
      <List.Section title="Results">
        {results.map((result: Result, index: number) => (
          <List.Item
            key={index}
            title={result.title}
            icon={result.icon ? result.icon : undefined}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={result.output ? result.output : ""} />
                <Action.Paste content={result.output ? result.output : ""} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function parseQuery(query: string, setResults: React.Dispatch<React.SetStateAction<Result[]>>): void {
  const results = [] as Result[];

  // Process query
  const queryArray = query.split(/[^A-Za-z0-9]/).filter((word) => word !== "");
  if (queryArray.length < 1) {
    setResults(results);
    return;
  }

  let queryType = "";
  let nums = [] as number[];
  let bypass = false;

  if (queryArray.length === 1 || queryArray.length === 3) {
    bypass = true;
    // Special case for choose and permutation
    let num1: number;
    let num2: number;

    if (queryArray.length === 1) {
      // check if there's two numbers separated by a c or a p
      let index = queryArray[0].toLowerCase().indexOf("choose");
      if (index !== -1) queryType = "choose";
      else {
        index = queryArray[0].toLowerCase().indexOf("permute");
        if (index !== -1) queryType = "permute";
        else {
          index = queryArray[0].toLowerCase().indexOf("c");
          if (index !== -1) queryType = "c";
          else {
            index = queryArray[0].toLowerCase().indexOf("p");
            if (index !== -1) queryType = "p";
            else {
              setResults(results);
              return;
            }
          }
        }
      }

      num1 = parseInt(queryArray[0].slice(0, index));
      num2 = parseInt(queryArray[0].slice(index + queryType.length));
    } else {
      queryType = queryArray[1].toLowerCase();
      num1 = parseInt(queryArray[0]);
      num2 = parseInt(queryArray[2]);
    }

    if (queryType === "c" || queryType === "choose") queryType = "choose";
    else if (queryType === "p" || queryType === "permute") queryType = "permutation";
    else bypass = false;

    if (isNaN(num1) || isNaN(num2)) bypass = false;
    else nums = [num1, num2];
  }

  if (!bypass) {
    // General case
    queryType = queryArray[0].toLowerCase();
    nums = queryArray
      .slice(1)
      .join(" ")
      .split(/[^0-9]/)
      .filter((word) => word !== "")
      .map((word) => parseInt(word));

    if (nums.length < 1) {
      setResults(results);
      return;
    }
  }

  // Carry out query
  let result;
  switch (queryType) {
    case "gcd":
    case "gcf":
    case "g":
      result = gcd(nums);
      results.push({
        title: `GCD of ${nums.length <= 10 ? nums.join(", ") : nums.splice(0, 11).join(", ") + "..."} is ${result}`,
        icon: Icon.CheckCircle,
        output: result.toString(),
      });
      break;

    case "lcm":
    case "l":
      result = lcm(nums);
      results.push({
        title: `LCM of ${nums.length <= 10 ? nums.join(", ") : nums.splice(0, 11).join(", ") + "..."} is ${result}`,
        icon: Icon.CheckCircle,
        output: result.toString(),
      });
      break;

    case "prime":
    case "isprime":
    case "p":
      nums.forEach((num) => {
        result = isPrime(num);
        results.push({
          title: `${num} is ${result ? "" : "not "}prime`,
          icon: result ? Icon.CheckCircle : Icon.XMarkCircle,
          output: result.toString(),
        });
      });
      break;

    case "factor":
    case "factors":
    case "divisors":
    case "factorise":
    case "factorize":
    case "f":
      nums.forEach((num) => {
        result = factor(num);
        results.push({
          title: `${num} has ${result.length} factors: ${result.join(", ")}`,
          icon: Icon.CheckCircle,
          output: result.join(", "),
        });
      });
      break;

    case "primefactor":
    case "primefactors":
    case "primefactorise":
    case "primefactorize":
    case "pfactor":
    case "pfactors":
    case "pfactorise":
    case "pfactorize":
    case "primef":
    case "pf":
      nums.forEach((num) => {
        result = [] as number[];
        primeFactor(num).forEach((pair) => result.push(`${pair[0]}^${pair[1]}`));
        results.push({
          title: `Prime Factorization of ${num} is ${result.join(" * ")}`,
          icon: Icon.CheckCircle,
          output: result.join(" * "),
        });
      });
      break;

    case "choose":
    case "combination":
    case "comb":
      result = choose(nums[0], nums[1]);
      results.push({
        title: `${nums[0]}C${nums[1]} = ${result}`,
        icon: Icon.CheckCircle,
        output: result.toString(),
      });
      break;

    case "permutation":
    case "permute":
    case "perm":
      result = permutation(nums[0], nums[1]);
      results.push({
        title: `${nums[0]}P${nums[1]} = ${result}`,
        icon: Icon.CheckCircle,
        output: result.toString(),
      });
  }

  setResults(results);
}

function gcd(nums: number[]): number {
  let result = nums[0];
  for (let i = 1; i < nums.length; i++) {
    result = gcd2(nums[i], result);
  }
  return result;
}

function gcd2(a: number, b: number): number {
  if (!a) {
    return b;
  }
  return gcd2(b % a, a);
}

function lcm(nums: number[]): number {
  let result = nums[0];
  for (let i = 1; i < nums.length; i++) {
    result = lcm2(nums[i], result);
  }
  return result;
}

function lcm2(a: number, b: number): number {
  return (a * b) / gcd2(a, b);
}

function isPrime(num: number): boolean {
  if (num === 2) return true;
  if (num < 2 || num % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function factor(num: number): number[] {
  const result = [] as number[];
  for (let i = 1; i <= Math.sqrt(num); i++) {
    if (num % i === 0) {
      result.push(i);
      if (num / i !== i) result.push(num / i);
    }
  }
  return result.sort((a, b) => a - b);
}

function primeFactor(num: number): number[][] {
  const result = [] as number[][];
  let index = 0;
  for (let i = 2; i <= num; i++) {
    while (num % i === 0) {
      if (result[index] === undefined) result[index] = [i, 0];
      result[index][1]++;
      num /= i;
    }
    if (result[index] !== undefined) index++;
  }
  return result;
}

function choose(n: number, k: number): number {
  if (k > n) return 0;
  if (k > n / 2) k = n - k;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= n - k + i;
    result /= i;
  }
  return result;
}

function permutation(n: number, k: number): number {
  if (k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result *= n - i;
  }
  return result;
}
