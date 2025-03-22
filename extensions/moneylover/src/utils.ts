import type { Wallet, Currency } from 'moneylover';

export function formatNumber(number: number, currency: string) {
  return number.toLocaleString('en-US', { style: 'currency', currency });
}

export function formatBalance(walletBalance: Wallet['balance']) {
  const { balance, currency } = getBalance(walletBalance);
  return formatNumber(balance, currency);
}

export function getBalance(walletBalance: Wallet['balance']) {
  const [currency, balanceAsString] = Object.entries(walletBalance[0])[0];
  const balance = +balanceAsString;

  return { balance, currency: currency as Currency };
}

export function getIcon(icon: string) {
  return `https://static.moneylover.me/img/icon/${icon}.png`;
}
