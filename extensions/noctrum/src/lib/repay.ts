import { Toast } from "@raycast/api";
import { ethers } from "ethers";
import { WalletData } from "./wallet";
import { NOCTRUM_DOMAIN, REPAY_LOAN_TYPES } from "./constants";
import { fetchPoolAddress, repayLoan as apiRepayLoan } from "./noctrum-api";
import { privateTransfer } from "./external-api";
import { loadProgress, saveProgress, clearProgress, runExclusive } from "./progress";

// Repay = private transfer of totalDue to the pool, then the signed repay request.
// The transfer is recorded per loan, so retrying after a failed request does not pay twice.
export async function repayLoan(wallet: WalletData, loanId: string, token: string, totalDue: string, toast: Toast) {
  const key = `repay:${wallet.address.toLowerCase()}:${loanId}`;
  await runExclusive(key, async () => {
    const progress = await loadProgress(key);

    if (progress.step < 1) {
      toast.title = "Transferring repayment to pool";
      await privateTransfer(wallet, await fetchPoolAddress(), token, totalDue);
      await saveProgress(key, { step: 1, data: {} });
    }

    toast.title = "Repaying loan";
    const signer = new ethers.Wallet(wallet.privateKey);
    const message = { account: wallet.address, loanId, amount: totalDue, timestamp: Math.floor(Date.now() / 1000) };
    const auth = await signer.signTypedData(NOCTRUM_DOMAIN, REPAY_LOAN_TYPES, message);
    await apiRepayLoan({ ...message, auth });
    await clearProgress(key);
  });
}
