import { Action, ActionPanel, Grid, Image } from "@raycast/api"
import { getAvatarIcon } from "@raycast/utils"
import fetch from "node-fetch"
import { useEffect, useState } from "react"
import { OpenPrefAction } from "./components/actions/OpenPrefAction"
import type { Video } from "./types"
import { getYoutubeVideoId, isImageUrl } from "./utils"

export default function Command() {
   const [videos, setVideos] = useState<Video[]>([])
   const [isLoading, setIsLoading] = useState(true)

   useEffect(() => {
      async function fetchVideos() {
         try {
            const response = await fetch("https://cursorrul.es/api/videos")
            const data = (await response.json()) as { data: Video[] }
            setVideos(data.data)
         } catch (error) {
            console.error("Error fetching videos:", error)
         } finally {
            setIsLoading(false)
         }
      }

      fetchVideos()
   }, [])

   if (isLoading) {
      return <Grid isLoading={true} />
   }

   return (
      <Grid>
         {videos.map((video) => (
            <Grid.Item
               key={video.url}
               title={video.title}
               subtitle={video.author.name}
               keywords={[video.title, video.author.name]}
               content={{
                  source: `https://img.youtube.com/vi/${getYoutubeVideoId(
                     video.url,
                  )}/mqdefault.jpg`,
               }}
               accessory={{
                  icon: {
                     source: isImageUrl(video.author.image)
                        ? video.author.image
                        : getAvatarIcon(video.author.name),
                     mask: Image.Mask.Circle,
                  },
                  tooltip: video.title,
               }}
               actions={
                  <ActionPanel>
                     <ActionPanel.Section title="Actions">
                        <Action.OpenInBrowser
                           url={`https://www.youtube.com/watch?v=${getYoutubeVideoId(
                              video.url,
                           )}`}
                        />
                     </ActionPanel.Section>
                     <ActionPanel.Section title="Settings">
                        <OpenPrefAction />
                     </ActionPanel.Section>
                  </ActionPanel>
               }
            />
         ))}
      </Grid>
   )
}
