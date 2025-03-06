import { Grid, Image, ActionPanel, Action } from "@raycast/api";
import { Video } from "./types";
import { getAvatarIcon } from "@raycast/utils";
import { getYoutubeVideoId, isImageUrl } from "./utils";
import { OpenPrefAction } from "./components/actions/OpenPrefAction";

// TODO temperary solution
const videos: Video[] = [
  {
    title: "Cursor AI tutorial for beginners",
    description:
      "In this episode, I am joined by Ras Mic, a full stack engineer & YouTuber, where we dive deep into the frameworks and strategies on how to best use Cursor AI. Mic shares his unique insights into how to use and set up Cursor to make the experience of building on top of Cursor as easy and seamless as possible. Learn how to use Cursor like a pro!",
    url: "https://www.youtube.com/embed/gqUQbjsYZLQ",
    author: {
      name: "Greg Isenberg",
      image:
        "https://yt3.ggpht.com/sRSt1MT1n-FL1JTsZCcW35Vbio2kVTIrvU2TRDPZd0IBxPa8TDLsZtCLPzPaljwEvdy4kBojjw=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Using Cursor + Claude 3.5 Sonnet + Tailwind to ship 20x faster",
    description: "Using Cursor + Claude 3.5 Sonnet + Tailwind to ship 20x faster",
    url: "https://www.youtube.com/embed/bEU15KXIAVk",
    author: {
      name: "Sahil Lavingia",
      image:
        "https://yt3.ggpht.com/7Hvm8iHnumiLr8aWtftr6rNckmhqt7FvhbxmUMD9eB55v_BSDmCPiFtCVRgR2JowNyz6al4Ohg=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Introduction to Cursor - AI Code Editor",
    description:
      "Discover Cursor: The revolutionary AI-powered code editor that’s transforming how developers work. Learn about its key features, natural language coding capabilities, and how it compares to traditional IDEs. Perfect for both beginners and experienced coders looking to boost productivity",
    url: "https://www.youtube.com/embed/sKxUEnylsQg",
    author: {
      name: "Tech•sistence",
      image: "https://img.youtube.com/vi/sKxUEnylsQg/maxresdefault.jpg",
    },
  },
  {
    title: "Coding with Cursor: Session 1",
    description: "Coding with Cursor: Session 1",
    url: "https://www.youtube.com/embed/1CC88QGQiEA",
    author: {
      name: "Sahil Lavingia",
      image:
        "https://yt3.ggpht.com/7Hvm8iHnumiLr8aWtftr6rNckmhqt7FvhbxmUMD9eB55v_BSDmCPiFtCVRgR2JowNyz6al4Ohg=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "How I code 159% Faster using AI (Cursor + Sonnet 3.5)",
    description:
      "Cursor is a powerful new AI-powered code editor that makes coding much faster with the help of AI. In this video I will show you the fastest way to code with the best AI coding tools: Cursor and Claude Sonnet 3.5.",
    url: "https://www.youtube.com/embed/yk9lXobJ95E",
    author: {
      name: "Volo",
      image:
        "https://yt3.ggpht.com/5SaI-Z9lEUBFO0Uv0wZK9olaKiLBmqyDlELKQywZQIdiBh_cuJMJqrvk2np3OFUMNalDrTdO=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Cursor Composer: MULTI-FILE AI Coding for engineers that SHIP",
    description: "Cursor Composer gives you INCREDIBLE Multi-File AI Coding Abilities",
    url: "https://www.youtube.com/embed/V9_RzjqCXP8",
    author: {
      name: "IndyDevDan",
      image:
        "https://yt3.ggpht.com/tRTaWiEPa4eLVJgg3K0gO6orKleaIhxKcQBc4LryL_xczX5leDI5-6NEaD5xKEpwAQ_M7a747g=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "How to Build an AI Web App with Claude 3.5 and Cursor | Full Tutorial",
    description: "AI Programming Full Tutorial: YouTube Search App | Cursor - Claude 3.5 ++",
    url: "https://www.youtube.com/embed/fv1rkctrEPk",
    author: {
      name: "All About AI",
      image:
        "https://yt3.ggpht.com/OLvM9exmm0IyZqyK_PLSNCcKZbkzUneljsQ7B_t6hjBawDy4mCYzLqQX8FxzNlVB8Tc10-VkJA=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "I Finally Tried The AI-Powered VS Code Killer | Cursor IDE Review",
    description: "I Finally Tried The AI-Powered VS Code Killer | Cursor IDE Review",
    url: "https://www.youtube.com/embed/u3wPImWBz7c",
    author: {
      name: "Your Average Tech Bro",
      image:
        "https://yt3.ggpht.com/-5pyvUOmvkobQLYDV39VhjNU4Fp4Z178V3_pHuxrokzwinC-CFo1omaY7Ra5-A_N7gLynPS3=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Cursor Editor - VS Code with GPT Built-In",
    url: "https://www.youtube.com/embed/tjFnifSEEjQ",
    description:
      "Cursor AI Editor is revolutionizing the way developers write code, offering an AI-powered environment that accelerates the software development process. With features like Ctrl+K, Copilot++, and AI chat, Cursor provides an unparalleled coding experience that’s both efficient and intuitive.",
    author: {
      name: "Chris Titus Tech",
      image:
        "https://yt3.ggpht.com/R_rSQnTYQkL-rbtTA7djVbXLjU8Bwgua8GHJz6Ollsbyx_txdu0qVDBudCqvpzaxRQfVp2F4=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Coding with Cursor: Session 4 ft. @shaoruu",
    url: "https://www.youtube.com/embed/42zmF9ARSWM",
    description: "Coding with Cursor: Session 4 ft. @shaoruu - developer at Cursor and Cursor Composer Creator",
    author: {
      name: "Sahil Lavingia",
      image:
        "https://yt3.ggpht.com/7Hvm8iHnumiLr8aWtftr6rNckmhqt7FvhbxmUMD9eB55v_BSDmCPiFtCVRgR2JowNyz6al4Ohg=s88-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Let's dig into CursorAI, do's don't, how to use it",
    url: "https://www.youtube.com/embed/_SN7fqSNThg?si=UYS8khW30im4bfxz",
    description:
      "@pierre_vannier walks through CursorAI, what it is, how to use it, and how to get the most out of it with Python and fastapi",
    author: {
      name: "Pierre Vannier",
      image:
        "https://yt3.ggpht.com/CmdYMKlESb6P6DoDZ11hbEzzZMbnIWLLn1Bovrcv3AjxRWdbGnUrgG0RtvycO04OLOrFs2emBg=s176-c-k-c0x00ffffff-no-rj-mo",
    },
  },
  {
    title: "Cursor Composer Tutorial: Building a directory in 30 minutes from scratch",
    url: "https://www.youtube.com/embed/nUTR11D8q08?si=aqh18rsdLbRWAOol",
    description:
      "@krisbuildsstuff shows how to build web directory using Cursor Composer and V0 Dev. You'll learn to build a tool listing, implement submission features, design individual pages, and organize tools into categories, and deploy with Vercel.",
    author: {
      name: "Kris Builds Stuff",
      image:
        "https://yt3.ggpht.com/XKgFFRlHWCIKHRXl1JFMBRW9VpHHVRUIpuTAudnHdPXAlSWINd7rRca8fSeqFf1lwkwmIvHbuA=s48-c-k-c0x00ffffff-no-rj",
    },
  },
  {
    title: "Building (and deploying!) with AI-assistance using Cursor, Claude and Cloudflare",
    url: "https://www.youtube.com/embed/oBDdcVaRhUk?si=8j-33MdX-1nHdxkR",
    description:
      "@rickyrobinett walks you through how to build, and deploy, an application using Cursor, Claude and Cloudflare..",
    author: {
      name: "Cloudflare",
      image:
        "https://yt3.ggpht.com/F3ahPSZ8266o3g-63hgpAYmLBxR2-Pove0uuE8OSKbcVRmuonb5wKAfCocdVrJ8bh8J315QwKA=s88-c-k-c0x00ffffff-no-rj",
    },
  },
];

export default function Command() {
  return (
    <Grid columns={3} aspectRatio="16/9">
      {videos.map((video) => (
        <Grid.Item
          key={video.url}
          title={video.author.name}
          subtitle={video.title}
          accessory={{
            icon: {
              source: (isImageUrl(video.author.image) && video.author.image) || getAvatarIcon(video.author.name),
              mask: Image.Mask.Circle,
            },
            tooltip: video.title,
          }}
          content={{
            source: `https://img.youtube.com/vi/${getYoutubeVideoId(video.url)}/mqdefault.jpg`,
          }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Actions">
                <Action.OpenInBrowser url={`https://www.youtube.com/watch?v=${getYoutubeVideoId(video.url)}`} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Settings">
                <OpenPrefAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
