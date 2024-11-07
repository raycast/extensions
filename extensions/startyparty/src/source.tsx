import { showToast, Toast, List, ActionPanel, Action, updateCommandMetadata } from '@raycast/api';
import { useState, useEffect } from 'react';
import axios from 'axios';

// API URL
const API_URL = "https://marko.tech/api/raycast";

// Define the response and post types to match the expected API response structure
interface Response {
  page: number;      // Current page number of the results
  paged: number;     // Number of posts per page
  pages: number;     // Total number of pages of results
  results: Post[];   // Array of posts in the current page
}

// Define the post type to match the expected API response structure
interface Post {
  _id: { $oid: string };  // MongoDB ID of the post
  feed: string;           // Feed source for the post (e.g., website or category)
  link: string;           // URL to read the full post
  title: string;          // Title of the post
  pub: number;            // Publication date of the post
}

// Function to format the publication date as a human-readable string
function timeAgo(unixTimestamp: number): string | null {
  if (!unixTimestamp || unixTimestamp < 0) return null

  const now = new Date().getTime()
  const secondsPast = (now - unixTimestamp * 1000) / 1000

  if (secondsPast < 60) {
    return 'just now'
  }

  if (secondsPast < 3600) {
    const minutes = Math.floor(secondsPast / 60)
    if (minutes === 1) return '1 min ago'
    return `${minutes} mins ago`
  }

  if (secondsPast < 86400) {
    const hours = Math.floor(secondsPast / 3600)
    if (hours <= 1) return '1 hour ago'
    return `${hours} hours ago`
  }

  if (secondsPast < 604800) {
    const days = Math.floor(secondsPast / 86400)
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  if (secondsPast < 31536000) {
    const weeks = Math.floor(secondsPast / 604800)
    if (weeks === 1) return '1 week ago'
    return `${weeks} weeks ago`
  }

  const years = Math.floor(secondsPast / 31536000)
  return `${years}years ago`
}

// Utility function to "slugify" the title (convert into a URL-friendly string)
function slugify(str: string): string {
  return str
    .toLowerCase()  // Convert to lowercase
    .trim()         // Remove leading/trailing spaces
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '')  // Remove non-alphanumeric characters (except hyphens)
    .replace(/--+/g, '-')  // Replace multiple hyphens with a single one
    .replace(/^-+/, '')    // Remove leading hyphens
    .replace(/-+$/, '');   // Remove trailing hyphens
}

// Function to fetch data from the API
async function fetchAPIData(): Promise<Response | null> {
  try {
    const response = await axios.get(API_URL);  // Send GET request to the API
    return response.data;  // Return the response data (which is an object of type Response)
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";  // Handle error if it occurs
    showToast(Toast.Style.Failure, "Error fetching data", message);  // Show error toast
    return null;  // Return null in case of error
  }
}

// Main component function to render the list of posts
export default function Command() {
  const [posts, setPosts] = useState<Post[]>([]);  // State to hold the list of posts
  const [isLoading, setIsLoading] = useState(true); // State to track if the data is still loading


  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    async function loadData() {
      const data = await fetchAPIData();  // Fetch data from the API
      await updateCommandMetadata({ subtitle: `Tech, Design & Dev News` });
      if (data && data.results) {
        setPosts(data.results);  // Set posts data if fetched successfully
      }
      setIsLoading(false);  // Set loading to false once the data is fetched
    }
    loadData();  // Call the loadData function
  }, []);  // Empty dependency array means this will run only once when the component mounts

  // If data is still loading, render a loading message
  if (isLoading) {
    return <List><List.Item title="Loading articles from 🏠 startyparty.dev..." /></List>;
  }

  // If no posts were fetched, show a message indicating no results
  if (posts.length === 0) {
    showToast(Toast.Style.Failure, "No data found.");  // Show toast indicating no data found
    return <List><List.Item title="No results found. Check startyparty.dev for more." /></List>;
  }

  // Render the list of posts once data has been successfully fetched
  return (
    <List>
      {posts.map((post) => (
        <List.Item
          key={post._id.$oid}  // Unique key for each item in the list, based on the post's MongoDB ID
          title={post.title}  // Title of the post displayed in the list
          subtitle={timeAgo(post.pub) || ``}
          accessories={[{ text: post.feed.toLocaleString() }]}  // Display the feed source as an accessory
          // Icon for the item, dynamically generated based on the feed
          icon={{
            source: `https://startyparty.nyc3.cdn.digitaloceanspaces.com/publishers/${slugify(post.feed)}.png`,
            fallback: "icon.png",  // Fallback icon if the generated URL fails
            tooltip: post.feed.toLocaleString(),  // Tooltip shows the feed name
          }}
          actions={  // Actions that can be performed when the item is clicked
            <ActionPanel>
              <Action.OpenInBrowser title="Read Article" url={post.link} />
              <ActionPanel.Section>
                {post.link && (
                  <Action.CopyToClipboard
                    content={post.link}
                    title="Copy Link"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
