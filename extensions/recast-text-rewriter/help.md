# Set Up Recast

Recast uses Claude on **your Amazon Bedrock account**. AWS usage charges apply; no Raycast AI subscription is required.

1. Configure an AWS profile and sign in using your organization’s login method. For IAM Identity Center, run `aws configure sso --profile my-profile`, then `aws sso login --profile my-profile` in your terminal.
2. Choose **Named Profile** and enter `my-profile` in **AWS Profile**, or use an existing SDK credential configuration with **Default Chain**. Terminal environment variables are usually not inherited by Raycast.
3. Confirm Claude model access in the [Bedrock console](https://console.aws.amazon.com/bedrock/). Your identity needs `bedrock:InvokeModelWithResponseStream` permission for the model and applicable inference profile and destination models.
4. Keep the model defaults to start, or choose a supported source Region and inference profile. **Global can process text outside your AWS Region.** Use an appropriate geography if your data policy requires it. Leave Temperature empty for Haiku 5.5.

Select text in another app and run a Recast command. Without a selection, enter text in the form. Review the result before choosing Paste.

[Full setup, privacy, and troubleshooting guide](https://github.com/msakowski/recast#setup)
