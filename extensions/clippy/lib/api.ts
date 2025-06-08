interface SaveLinkParams {
  url: string;
  title?: string;
  token: string;
  apiUrl: string;
}

interface SaveLinkResponse {
  success: boolean;
  message?: string;
  pageId?: string;
  error?: string;
}

/**
 * Save a link to Clippy using the API
 */
export async function saveLink({ url, title, token, apiUrl }: SaveLinkParams): Promise<SaveLinkResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/links/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url,
        title,
        read: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Provide more specific error messages based on status code
      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Check your permissions.";
      } else if (response.status === 400) {
        errorMessage = errorData.message || "Invalid request data. Please check the URL.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    return {
      success: true,
      pageId: data.pageId,
      message: "Link saved successfully",
    };
  } catch (error) {

    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Check your internet connection and API URL.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Test API connection and authentication
 */
interface RecentLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  isRead: boolean;
  domain?: string;
  author?: string;
  publicationDate?: string;
  createdTime?: string;
}

interface RecentLinksResponse {
  success: boolean;
  links?: RecentLink[];
  error?: string;
}

/**
 * Fetch recent unread links from Clippy
 */
export async function fetchRecentLinks({
  token,
  apiUrl,
}: {
  token: string;
  apiUrl: string;
}): Promise<RecentLinksResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/links/recent`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Check your permissions.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    return {
      success: true,
      links: data.links || [],
    };
  } catch (error) {

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Check your internet connection and API URL.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Mark a link as read in Clippy
 */
export async function markLinkAsRead({
  pageId,
  token,
  apiUrl,
}: {
  pageId: string;
  token: string;
  apiUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/links/mark-read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pageId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Check your permissions.";
      } else if (response.status === 400) {
        errorMessage = errorData.message || "Invalid request data.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Check your internet connection and API URL.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Delete a link from Clippy
 */
export async function deleteLink({
  pageId,
  token,
  apiUrl,
}: {
  pageId: string;
  token: string;
  apiUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/links/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pageId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Check your permissions.";
      } else if (response.status === 400) {
        errorMessage = errorData.message || "Invalid request data.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Check your internet connection and API URL.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Test API connection and authentication
 */
export async function testConnection(
  token: string,
  apiUrl: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${apiUrl}/api/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await response.json().catch(() => ({}));

      let errorMessage = "Connection test failed";
      if (response.status === 401) {
        errorMessage = "Invalid authentication token";
      } else if (response.status >= 500) {
        errorMessage = "Server is not responding";
      } else if (response.status === 404) {
        errorMessage = "API endpoint not found. Check your API URL.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Check your internet connection and API URL.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
