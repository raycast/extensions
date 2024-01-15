interface HighAmount {
  showFeePercentage: boolean;
  trackAsHighAmountSender: boolean;
  showEducationStep: boolean;
  offerPrefundingOption: boolean;
  overLimitThroughCs: boolean;
  overLimitThroughWiseAccount: boolean;
}

interface TransferFlowConfig {
  highAmount: HighAmount;
}

interface FeeValue {
  amount: number;
  currency: string;
  label: string;
}

interface PriceItem {
  type: string;
  label: string;
  value: FeeValue;
}

interface PriceTotal {
  type: string;
  label: string;
  value: FeeValue;
}

interface Price {
  priceSetId: number;
  total: PriceTotal;
  items: PriceItem[];
}

interface Fee {
  transferwise: number;
  payIn: number;
  discount: number;
  total: number;
  priceSetId: number;
  partner: number;
}

interface DisabledReason {
  code: string;
  message: string;
  path: string;
}

export type PaymentOption = {
  formattedEstimatedDelivery: string;
  estimatedDeliveryDelays: any[];
  allowedProfileTypes: string[];
  feePercentage: number;
  estimatedDelivery: string;
  disabled: boolean;
  disabledReason: DisabledReason;
  sourceAmount: number;
  targetAmount: number;
  sourceCurrency: string;
  targetCurrency: string;
  payOut: string;
  fee: Fee;
  price: Price;
  payIn: string;
};

export interface Response {
  sourceAmount: number;
  guaranteedTargetAmountAllowed: boolean;
  targetAmountAllowed: boolean;
  preferredPayIn: string;
  paymentOptions: PaymentOption[];
  transferFlowConfig: TransferFlowConfig;
  rateTimestamp: string;
  clientId: string;
  expirationTime: string;
  type: string;
  status: string;
  rate: number;
  sourceCurrency: string;
  targetCurrency: string;
  createdTime: string;
  rateType: string;
  rateExpirationTime: string;
  payOut: string;
  guaranteedTargetAmount: boolean;
  providedAmountType: string;
  funding: string;
}

export interface Preferences {
  defaultAmount: string;
  defaultTargetCurrency: string;
}
