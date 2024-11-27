//
//  asset-actions.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { ActionPanel, Action, Icon, showToast, Toast, open, showInFinder } from "@raycast/api"
import { AssetFormat, AssetScale } from "@supernovaio/supernova-sdk"
import { assetLocalDownloadToSupportPath, assetLocalDownloadToUserDownloadsPath } from "../../utilities/url"
import { copyFileByPath } from "../../utilities/native"
import { AssetActionItemProps, AssetActionProps } from "../../definitions/props"
import { showErrorToast } from "../../utilities/toasts"
import fs from "fs"
import fetch from "node-fetch"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const AssetActions = (props: AssetActionProps) => {
  // ----- Render
  return (
    <ActionPanel>
      <ActionPanel.Section title={"Copy Asset"}>
        <AssetCopyActions {...props} />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Download Asset"}>
        <AssetDownloadActions {...props} />
      </ActionPanel.Section>
    </ActionPanel>
  )
}

const AssetDownloadActions = (props: AssetActionProps): JSX.Element => {
  return (
    <>
      <DownloadAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.svg} scale={AssetScale.x1} />
      <DownloadAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x1} />
      <DownloadAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x2} />
      <DownloadAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x3} />
      <DownloadAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.pdf} scale={AssetScale.x1} />
    </>
  )
}

const AssetCopyActions = (props: AssetActionProps): JSX.Element => {
  return (
    <>
      <CopyAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.svg} scale={AssetScale.x1} />
      <CopyAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x1} />
      <CopyAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x2} />
      <CopyAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.png} scale={AssetScale.x3} />
      <CopyAsset asset={props.asset} sdk={props.sdk} format={AssetFormat.pdf} scale={AssetScale.x1} />
    </>
  )
}

const CopyAsset = (props: AssetActionItemProps): JSX.Element => {
  return (
    <Action
      title={`Copy as ${props.format.toString().toUpperCase()}${props.format === AssetFormat.png ? ` (${props.scale.toString()})` : ""}`}
      icon={Icon.Download}
      onAction={async () => {
        showToast(Toast.Style.Animated, "Downloading")
        try {
          const resource = await props.sdk.retrieveDownloadAssetPath(props.asset, props.format, props.scale)
          if (!resource) {
            showErrorToast(`Unable to copy ${props.asset.name} from your library. Check your internet connection and try again.`)
          }
          const downloadedAsset = await fetch(resource!.sourceUrl)
          const buffer = Buffer.from(await downloadedAsset.arrayBuffer())
          const writePath = assetLocalDownloadToSupportPath(resource!)
          fs.writeFileSync(writePath, buffer)
          await copyFileByPath(writePath)
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: `Asset copied to clipboard`
          }
          showToast(options)
        } catch (error) {
          showErrorToast(`Unable to copy ${props.asset.name} from your library. ${(error as any).message}`)
        }
      }}
    />
  )
}

const DownloadAsset = (props: AssetActionItemProps): JSX.Element => {
  return (
    <Action
      title={`Download as ${props.format.toString().toUpperCase()}${props.format === AssetFormat.png ? ` (${props.scale.toString()})` : ""}`}
      icon={Icon.Download}
      onAction={async () => {
        showToast(Toast.Style.Animated, "Downloading")
        try {
          const resource = await props.sdk.retrieveDownloadAssetPath(props.asset, props.format, props.scale)
          if (!resource) {
            showErrorToast(`Unable to download ${props.asset.name} from your library. Check your internet connection and try again.`)
          }
          const downloadedAsset = await fetch(resource!.sourceUrl)
          const buffer = Buffer.from(await downloadedAsset.arrayBuffer())
          const writePath = assetLocalDownloadToUserDownloadsPath(resource!)
          fs.writeFileSync(writePath, buffer)
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: `${props.asset.name} stored to /Downloads`,
            primaryAction: {
              title: "Open asset file",
              onAction: (toast) => {
                open(writePath)
                toast.hide()
              }
            },
            secondaryAction: {
              title: "Show in Finder",
              onAction: (toast) => {
                showInFinder(writePath)
                toast.hide()
              }
            }
          }
          showToast(options)
        } catch (error) {
          showErrorToast(`Unable to download ${props.asset.name} from your library. ${(error as any).message}.`)
        }
      }}
    />
  )
}
