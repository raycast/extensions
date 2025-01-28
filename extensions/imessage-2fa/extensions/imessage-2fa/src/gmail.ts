import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { authenticate } from '@google-cloud/local-auth';
import * as path from 'path';
import { environment } from "@raycast/api";

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(environment.supportPath, 'token.json');
const CREDENTIALS_PATH = path.join(environment.supportPath, 'credentials.json');

export class GmailProvider {
  private auth: OAuth2Client | null = null;

  async authenticate() {
    try {
      this.auth = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });
      // Save token for future use
      // TODO: Implement token saving/loading
      return this.auth;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async findRecentCodes(timeWindowMinutes: number = 5): Promise<string[]> {
    if (!this.auth) {
      await this.authenticate();
    }

    const gmail = google.gmail({ version: 'v1', auth: this.auth });
    const timeFilter = Math.floor((Date.now() - timeWindowMinutes * 60000) / 1000);

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `after:${timeFilter}`,
        maxResults: 10,
      });

      const codes: string[] = [];
      
      if (response.data.messages) {
        for (const message of response.data.messages) {
          const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
          });

          // Extract message content
          const content = messageDetails.data.snippet || '';
          
          // Use the same code extraction logic as your existing implementation
          const matches = content.match(/\b\d{6}\b/g);
          if (matches) {
            codes.push(...matches);
          }
        }
      }

      return [...new Set(codes)]; // Remove duplicates
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }
} 