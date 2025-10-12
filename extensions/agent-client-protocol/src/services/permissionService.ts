/**
 * Permission Service
 *
 * Provides user prompts and persistence for ACP tool permission requests.
 */

import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { createLogger } from "@/utils/logging";
import { ConfigService } from "./configService";
import type { SecuritySettings } from "@/types/extension";
import type { RequestPermissionRequest, RequestPermissionResponse, PermissionOption } from "@/types/acp";

const logger = createLogger("PermissionService");

export class PermissionService {
  constructor(private readonly configService: ConfigService = new ConfigService()) {}

  /**
   * Handle an ACP permission request from an agent.
   */
  async handlePermissionRequest(request: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    try {
      const settings = await this.configService.getSecuritySettings();
      const descriptor = this.buildDescriptor(request);

      if (!settings.requirePermissionForTools) {
        logger.info("Tool permission auto-approved (policy disabled)", { descriptor });
        return this.buildResponse(this.findAllowOption(request.options));
      }

      if (settings.trustedTools?.includes(descriptor)) {
        logger.info("Tool permission auto-approved (trusted)", { descriptor });
        return this.buildResponse(this.findAllowAlwaysOption(request.options) ?? this.findAllowOption(request.options));
      }

      const allowAlwaysOption = this.findAllowAlwaysOption(request.options);
      if (allowAlwaysOption) {
        const always = await this.promptAlwaysAllow(request, settings);
        if (always) {
          await this.persistTrustedTool(descriptor, settings);
          return this.buildResponse(allowAlwaysOption);
        }
      }

      const allowOption = this.findAllowOption(request.options);
      if (!allowOption) {
        logger.warn("No allow option available; denying request", { options: request.options });
        return this.buildCancelResponse(request.options);
      }

      const allowOnce = await this.promptAllowOnce(request);
      if (allowOnce) {
        return this.buildResponse(allowOption);
      }

      return this.buildCancelResponse(request.options);
    } catch (error) {
      logger.error("Failed to handle permission request", { error });
      await showToast({
        style: Toast.Style.Failure,
        title: "Permission Error",
        message: error instanceof Error ? error.message : "Unknown permission error"
      });
      return { outcome: { outcome: "cancelled" } };
    }
  }

  private async promptAlwaysAllow(request: RequestPermissionRequest, settings: SecuritySettings): Promise<boolean> {
    const primaryPath = this.getPrimaryPath(request);

    const messageParts = [
      request.toolCall.title ?? "Agent action request",
      primaryPath ? `Path: ${primaryPath}` : null,
      request.toolCall.kind ? `Action: ${request.toolCall.kind}` : null,
      "",
      "Always allow this action for future requests?"
    ].filter(Boolean);

    const allowAlways = await confirmAlert({
      title: "Always Allow Agent Action?",
      message: messageParts.join("\n"),
      primaryAction: {
        title: "Always Allow",
        style: Alert.ActionStyle.Default
      },
      dismissAction: {
        title: "Not Now",
        style: Alert.ActionStyle.Cancel
      }
    });

    if (allowAlways) {
      await showToast({
        style: Toast.Style.Success,
        title: "Always Allow Enabled",
        message: primaryPath ?? request.toolCall.title ?? undefined
      });
    }

    return allowAlways;
  }

  private async promptAllowOnce(request: RequestPermissionRequest): Promise<boolean> {
    const primaryPath = this.getPrimaryPath(request);
    const description = this.getDescription(request);

    const messageParts = [
      request.toolCall.title ?? "Agent action request",
      primaryPath ? `Path: ${primaryPath}` : null,
      description ? `Details: ${description}` : null,
      "",
      "Allow this action?"
    ].filter(Boolean);

    const allow = await confirmAlert({
      title: "Agent Permission Request",
      message: messageParts.join("\n"),
      primaryAction: {
        title: "Allow",
        style: Alert.ActionStyle.Default
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel
      }
    });

    if (allow) {
      await showToast({
        style: Toast.Style.Success,
        title: "Permission Granted",
        message: primaryPath ?? request.toolCall.title ?? undefined
      });
    } else {
      await showToast({
        style: Toast.Style.Animated,
        title: "Permission Denied",
        message: primaryPath ?? request.toolCall.title ?? undefined
      });
    }

    return allow;
  }

  private findAllowAlwaysOption(options: PermissionOption[]): PermissionOption | undefined {
    return options.find((option) => option.kind === "allow_always" || option.kind === "allow");
  }

  private findAllowOption(options: PermissionOption[]): PermissionOption | undefined {
    const allowOnce = options.find((option) => option.kind === "allow_once");
    if (allowOnce) {
      return allowOnce;
    }
    return options.find((option) => option.kind === "allow" || option.kind === "allow_always");
  }

  private findDenyOption(options: PermissionOption[]): PermissionOption | undefined {
    return options.find((option) => option.kind === "deny" || option.kind === "reject_once");
  }

  private buildResponse(option?: PermissionOption): RequestPermissionResponse {
    if (!option) {
      return { outcome: { outcome: "cancelled" } };
    }

    return {
      outcome: {
        outcome: "selected",
        optionId: option.optionId
      }
    };
  }

  private buildCancelResponse(options: PermissionOption[]): RequestPermissionResponse {
    const denyOption = this.findDenyOption(options);
    if (denyOption) {
      return this.buildResponse(denyOption);
    }
    return { outcome: { outcome: "cancelled" } };
  }

  private buildDescriptor(request: RequestPermissionRequest): string {
    const primaryPath = this.getPrimaryPath(request);
    return JSON.stringify({
      title: request.toolCall.title,
      kind: request.toolCall.kind,
      path: primaryPath
    });
  }

  private getPrimaryPath(request: RequestPermissionRequest): string | undefined {
    const location = request.toolCall.locations?.find((item) => "path" in item) as { path?: string } | undefined;
    return location?.path;
  }

  private getDescription(request: RequestPermissionRequest): string | undefined {
    const firstContent = request.toolCall.content?.[0];
    if (!firstContent) {
      return undefined;
    }

    if ("text" in firstContent && typeof firstContent.text === "string") {
      return firstContent.text;
    }

    return undefined;
  }

  private async persistTrustedTool(descriptor: string, settings: SecuritySettings): Promise<void> {
    const updated = new Set(settings.trustedTools ?? []);
    updated.add(descriptor);
    await this.configService.updateSecuritySettings({
      trustedTools: Array.from(updated)
    });
  }
}
