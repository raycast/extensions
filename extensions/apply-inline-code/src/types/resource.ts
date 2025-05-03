import { Application } from './application';
import { Website } from './website';

interface WebsiteResource extends Website {
  type: 'website';
}
interface ApplicationResource extends Application {
  type: 'application';
}

export type Resource = WebsiteResource | ApplicationResource;
