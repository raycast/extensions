export const createTwentyPhoneObject = (
  primaryPhoneNumber: string,
  primaryPhoneCountryCode: string,
  primaryPhoneCallingCode: string,
) => {
  const normalizedPrimaryPhoneNumber = primaryPhoneNumber?.trim();
  const normalizedPrimaryPhoneCountryCode = primaryPhoneCountryCode?.trim();
  const normalizedPrimaryPhoneCallingCode = primaryPhoneCallingCode?.trim();

  if (!normalizedPrimaryPhoneNumber && !normalizedPrimaryPhoneCountryCode && !normalizedPrimaryPhoneCallingCode) {
    return null;
  }

  return {
    primaryPhoneNumber: normalizedPrimaryPhoneNumber ?? "",
    primaryPhoneCountryCode: normalizedPrimaryPhoneCountryCode?.toUpperCase() ?? "",
    primaryPhoneCallingCode: normalizedPrimaryPhoneCallingCode ?? "",
    additionalPhones: null,
  };
};
