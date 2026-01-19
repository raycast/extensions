import { ExecException } from "child_process";

export class IvpnCliError extends Error implements ExecException {
  cmd?: string | undefined;
  killed?: boolean | undefined;
  code?: number | undefined;
  signal?: NodeJS.Signals | undefined;
  stdout?: string;
  stderr?: string;

  constructor(message: string, execException: ExecException, name: string) {
    super(message);
    Object.assign(this, execException);
    this.name = name;
  }
}

export class IvpnCliNotFoundError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnCliNotFoundError");
  }
}

export class IvpnNotLoggedInError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnNotLoggedInError");
  }
}

export class IvpnInvalidAccountIdError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnInvalidAccountIdError");
  }
}

export class IvpnPingAlreadyInProgressError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnPingAlreadyInProgressError");
  }
}

export class IvpnSubscriptionExpiredError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnSubscriptionExpiredError");
  }
}

export class IvpnFreeTrialExpiredError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnFreeTrialExpiredError");
  }
}

export class IvpnServersPingingSkippedError extends IvpnCliError {
  constructor(execException: ExecException) {
    super(execException.message, execException, "IvpnServersPingingSkippedError");
  }
}
