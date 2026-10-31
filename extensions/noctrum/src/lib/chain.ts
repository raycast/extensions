import { ethers } from "ethers";
import { RPC_URL, ERC20_ABI, VAULT_ABI, VAULT_ADDRESS } from "./constants";

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getSignerFromPk(pk: string) {
  return new ethers.Wallet(pk, getProvider());
}

export async function getOnChainBalance(token: string, address: string): Promise<string> {
  const contract = new ethers.Contract(token, ERC20_ABI, getProvider());
  const bal: bigint = await contract.balanceOf(address);
  return bal.toString();
}

export async function getEthBalance(address: string): Promise<string> {
  const bal = await getProvider().getBalance(address);
  return bal.toString();
}

export async function approveToken(pk: string, token: string, amount: string): Promise<string> {
  const signer = getSignerFromPk(pk);
  const contract = new ethers.Contract(token, ERC20_ABI, signer);
  const tx = await contract.approve(VAULT_ADDRESS, amount);
  await tx.wait();
  return tx.hash;
}

export async function depositToVault(pk: string, token: string, amount: string): Promise<string> {
  const signer = getSignerFromPk(pk);
  const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  const tx = await contract.deposit(token, amount);
  await tx.wait();
  return tx.hash;
}

export async function withdrawWithTicket(pk: string, token: string, amount: string, ticket: string): Promise<string> {
  const signer = getSignerFromPk(pk);
  const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  const tx = await contract.withdrawWithTicket(token, amount, ticket);
  await tx.wait();
  return tx.hash;
}
