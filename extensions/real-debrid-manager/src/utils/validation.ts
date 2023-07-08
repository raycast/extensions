import { LinkType } from "../schema";

type ValidationResult = {
  valid: boolean;
  type: null | LinkType;
};

export const validateLinkInput = (link?: string): ValidationResult => {
  const validationResult: ValidationResult = {
    valid: false,
    type: null,
  };

  if (link) {
    const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/;
    const magnetPattern = /^magnet:\?xt=urn:btih:[a-z0-9]{20,}.*$/i;

    if (urlPattern.test(link)) {
      validationResult.valid = true;
      validationResult.type = "link";
    } else if (magnetPattern.test(link)) {
      validationResult.valid = true;
      validationResult.type = "magnet";
    }
  }

  return validationResult;
};
