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
    .replace(/,/g, '')
    .toLowerCase();

  if (cleanInput === '') {
    return [];
  }

  const output: FormattedNumber[] = [];
  try {
    let input = cleanInput;
    let isWei = false;
    let isEther = false;

    if (input.endsWith('wei')) {
      input = input.slice(0, -3).trim();
      isWei = true;
    } else if (input.endsWith('eth') || input.endsWith('ether')) {
      input = input.replace(/(eth|ether)$/, '').trim();
      isEther = true;
    }

    if (!isValidNumber(input)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid input',
        message: 'Please enter a valid number',
      });
      return [];
    }

    input = expandExponential(input);

    if (isWei) {
      // Convert Wei to Ether
      const value = formatUnits(input, 18);
      output.push({
        value,
        unit: 'ether',
        decimals: 18,
        displayNumber: Intl.NumberFormat('en-US', {
          maximumFractionDigits: 18,
        }).format(parseFloat(value)),
      });
    } else if (isEther || (!isWei && !isEther)) {
      // Convert Ether to Wei (default case or when ETH/ETHER suffix is present)
      const value = parseUnits(input, 18).toString();
      output.push({
        value,
        unit: 'wei',
        decimals: 0,
        displayNumber: value,
      });
    }

    // Add other denominations
    const denominations = [
      { name: 'gwei', decimals: 9 },
      { name: 'mwei', decimals: 6 },
      { name: 'kwei', decimals: 3 },
    ];

    for (const denom of denominations) {
      const value = formatUnits(
        parseUnits(input, isWei ? 0 : 18),
        denom.decimals,
      );
      output.push({
        value,
        unit: denom.name,
        decimals: denom.decimals,
        displayNumber: Intl.NumberFormat('en-US', {
          maximumFractionDigits: denom.decimals,
        }).format(parseFloat(value)),
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
