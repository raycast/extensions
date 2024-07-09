import {
  ActionPanel,
  Action,
  getSelectedText,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { formatUnits, parseUnits, FixedNumber } from 'ethers';
import { useEffect, useMemo, useState } from 'react';

interface FormattedNumber {
  value: string;
  unit: string;
  decimals: number;
  displayNumber: string;
}

function getResults(rawInput: string): FormattedNumber[] {
  const cleanInput = rawInput
    .replace(' ', '')
    .replace(/\n/g, '')
    .replace(/,/g, '');
  if (cleanInput === '') {
    return [];
  }
  if (!isValidNumber(cleanInput)) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Invalid input',
      message: 'Please enter a valid number',
    });
    return [];
  }
  const output: FormattedNumber[] = [];
  try {
    const input = expandExponential(cleanInput);
    const fnInput = FixedNumber.fromString(input, { decimals: 18, width: 512 });
    let value, unit, decimals, displayNumber;
    if (fnInput.gte(FixedNumber.fromValue(1e13))) {
      value = formatUnits(parseUnits(input, 0), 18);
      unit = 'ether';
      decimals = 18;
      displayNumber = Intl.NumberFormat('en-US', {
        maximumFractionDigits: decimals,
      }).format(parseFloat(value));
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });

      value = formatUnits(parseUnits(input, 0), 6);
      unit = 'mwei';
      decimals = 6;
      displayNumber = Intl.NumberFormat('en-US', {
        maximumFractionDigits: decimals,
      }).format(parseFloat(value));
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });

      value = formatUnits(parseUnits(input, 0), 0);
      unit = 'wei';
      decimals = 18;
      displayNumber = value;
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });
    } else if (fnInput.lt(FixedNumber.fromValue(1))) {
      value = formatUnits(parseUnits(input, 6), 0);
      unit = 'mwei';
      decimals = 6;
      displayNumber = value;
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });

      value = formatUnits(parseUnits(input, 18), 0);
      unit = 'wei';
      decimals = 18;
      displayNumber = value;
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });
    } else {
      try {
        value = formatUnits(parseUnits(input, 0), 6);
        unit = 'mwei';
        decimals = 6;
        displayNumber = Intl.NumberFormat('en-US', {
          maximumFractionDigits: decimals,
        }).format(parseFloat(value));
        output.push({
          value,
          unit,
          decimals,
          displayNumber,
        });
      } catch {
        // Do nothing
      }

      try {
        value = formatUnits(parseUnits(input, 6), 0);
        unit = 'mwei';
        decimals = 6;
        displayNumber = value;
        output.push({
          value,
          unit,
          decimals,
          displayNumber,
        });
      } catch {
        // Do nothing
      }

      value = formatUnits(parseUnits(input, 18), 0);
      unit = 'wei';
      decimals = 18;
      displayNumber = value;
      output.push({
        value,
        unit,
        decimals,
        displayNumber,
      });
    }
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Conversion failed',
    });
  }
  return output;
}

function isValidNumber(input: string) {
  const cleanInput = input
    .replace(' ', '')
    .replace(/\n/g, '')
    .replace(/,/g, '');
  // Check if the remaining string is a valid number
  try {
    FixedNumber.fromString(expandExponential(cleanInput), {
      decimals: 18,
      width: 512,
    });
    return true;
  } catch {
    return false;
  }
}

function expandExponential(input: string): string {
  if (input.includes('e')) {
    return parseFloat(input).toString();
  } else {
    // If input is already a regular number, return it
    return input;
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState('');
  const results = useMemo(() => getResults(searchText), [searchText]);

  useEffect(() => {
    getSelectedText()
      .then((selectedText) => {
        const cleanInput = selectedText
          .replace(' ', '')
          .replace(/\n/g, '')
          .replace(/,/g, '');
        if (isValidNumber(selectedText) && searchText === '') {
          setSearchText(cleanInput);
        }
      })
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to get selected text',
        });
      });
  }, []);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      {results.map((result, index) => (
        <List.Item
          key={index}
          title={result.displayNumber}
          subtitle={result.unit}
          actions={
            <ActionPanel title="Actions">
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={result.value}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
