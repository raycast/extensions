import { LINTEN_CLOUD_BASE } from "./api";

export interface CloudTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

export const BUILTIN_CLOUD_TEMPLATES: CloudTemplate[] = [
  {
    id: "custom",
    name: "Blank Canvas",
    category: "Starter",
    description: "Minimal Spec v2 scaffold with Core and Optional sections",
    content: `# Acme Corporation

> Concise summary of what Acme Corporation does for AI crawlers and developers.

## Core Documentation

- [Quickstart Guide](https://acme.com/docs/quickstart): 5-minute onboarding guide and first setup
- [Architecture & Design](https://acme.com/docs/architecture): Distributed system design and patterns
- [API Reference](https://acme.com/docs/api): Complete endpoint schemas and parameters

## Optional

- [Changelog](https://acme.com/changelog): Version releases, updates, and deprecation notices
- [Status Page](https://status.acme.com): Live infrastructure health and incident reports
`,
  },
  {
    id: "saas",
    name: "SaaS & Cloud Platform",
    category: "Technology",
    description:
      "Enterprise multi-tenant cloud infrastructure, telemetry, and identity orchestration",
    content: `# Acme Corp Cloud Platform

> Enterprise multi-tenant cloud infrastructure, real-time telemetry streaming, and automated identity orchestration.

## Platform Documentation

- [Quickstart Guide](https://acme.com/docs/quickstart): 5-minute onboarding tutorial and first project setup
- [Architecture & Design](https://acme.com/docs/architecture): Distributed consensus, multi-region failover, and high-availability patterns
- [REST & GraphQL API Reference](https://acme.com/docs/api): Complete endpoint schemas, rate limit headers, and webhook specifications
- [Client SDKs](https://acme.com/docs/sdks): Official Python, TypeScript, Go, Java, and Rust client libraries

## Enterprise Security & Governance

- [SSO & Identity Federation](https://acme.com/docs/sso): SAML 2.0, OIDC, Okta, and Azure AD enterprise directory integration
- [SOC 2 & Compliance Center](https://acme.com/trust): ISO 27001 certifications, penetration test executive summaries, and HIPAA BAA
- [Audit Logs & SIEM Export](https://acme.com/docs/audit-logs): Real-time streaming to Datadog, Splunk, and Amazon S3

## Pricing & Subscription Tiers

- [License Models](https://acme.com/pricing): Developer, Growth, and Dedicated Single-Tenant Enterprise packages
- [Usage Calculator](https://acme.com/pricing/calculator): Dynamic egress, storage, and monthly active user cost projection

## Optional

- [Platform Status Dashboard](https://status.acme.com): Live component uptime, incident history, and SLA uptime metrics
- [Product Changelog](https://acme.com/changelog): Weekly release notes, protocol enhancements, and deprecation schedules
`,
  },
  {
    id: "api",
    name: "Developer API & SDKs",
    category: "Technology",
    description:
      "Programmatic interface specifications, rate limits, and SDK guides",
    content: `# Acme Corp Developer API Reference

> Comprehensive programmatic interface specifications, authentication protocols, and SDK guides.

## Core API Resources

- [Authentication & Keys](https://acme.com/docs/api/auth): Provisioning API tokens, HMAC signatures, and bearer token rotation
- [Rate Limits & Quotas](https://acme.com/docs/api/limits): Tiered token-bucket thresholds, retry-after semantics, and burst quotas
- [Endpoints Directory](https://acme.com/docs/api/endpoints): Interactive OpenAPI 3.1 definitions for CRUD operations and batch processing
- [Webhooks & Events](https://acme.com/docs/api/webhooks): Real-time event notifications, payload signatures, and idempotency keys

## Client Libraries & Tooling

- [Python SDK](https://acme.com/docs/sdks/python): Asynchronous client with Pydantic typing and automatic retry backoff
- [TypeScript SDK](https://acme.com/docs/sdks/typescript): Zero-dependency Node.js and browser universal client
- [Go Client Module](https://acme.com/docs/sdks/go): Idiomatic Go package with context cancellation and connection pooling

## Optional

- [Postman Collection](https://acme.com/docs/postman): Ready-to-import testing suite with pre-configured environment variables
- [API Changelog](https://acme.com/docs/api/changelog): Semantic versioning releases, schema migrations, and deprecation timelines
`,
  },
  {
    id: "ecommerce",
    name: "E-Commerce & Retail Catalog",
    category: "Commerce",
    description:
      "Lifestyle merchandise, technical apparel, and global logistics fulfillment",
    content: `# Acme Corp Global Commerce & Retail

> Direct-to-consumer lifestyle merchandise, technical apparel, and global logistics fulfillment network.

## Product Collections & Catalog

- [Apparel & Outerwear](https://acme.com/catalog/apparel): Weatherproof jackets, technical mid-layers, and sustainable activewear
- [Equipment & Modular Gear](https://acme.com/catalog/gear): Ergonomic backpacks, travel luggage, and outdoor hardware
- [Footwear & Trail Boots](https://acme.com/catalog/footwear): Waterproof running shoes, hiking boots, and everyday sneakers
- [New Releases & Collaborations](https://acme.com/catalog/new): Seasonal product drops and limited artisan releases

## Customer Care & Operations

- [Real-Time Order Tracking](https://acme.com/support/order-tracking): Live courier tracking with delivery status notifications
- [Returns & Lifetime Guarantee](https://acme.com/support/returns): 30-day pre-paid return labels and lifetime hardware repair policy
- [Size & Measurement Charts](https://acme.com/support/sizing): Detailed chest, waist, and inseam measurements with fit recommendations
- [International Shipping Policy](https://acme.com/support/shipping): Customs duties, DDP shipping tiers, and regional delivery windows

## Optional

- [Sustainability & Carbon Offsets](https://acme.com/about/sustainability): Recycled fabric standards, fair trade factories, and carbon reporting
- [Flagship Store Locator](https://acme.com/stores): Physical retail boutique addresses, showroom booking, and local hours
`,
  },
  {
    id: "healthcare",
    name: "Healthcare, Hospital & Clinic",
    category: "Medical",
    description:
      "Multi-specialty hospital network, outpatient surgery, and clinical facilities",
    content: `# Acme Healthcare & Clinical System

> Multi-specialty hospital network, outpatient surgical centers, and certified clinical research facilities.

## Clinical Specialties

- [Cardiology & Heart Center](https://acme.com/specialties/cardiology): Diagnostic imaging, preventative electrophysiology, and bypass surgery
- [Orthopedics & Joint Institute](https://acme.com/specialties/orthopedics): Robotic joint replacement, sports rehabilitation, and spine therapy
- [Oncology & Cancer Care](https://acme.com/specialties/oncology): Targeted immunotherapy, precision radiation, and infusion suites
- [Family & Primary Medicine](https://acme.com/specialties/primary-care): Annual preventative exams, vaccinations, and chronic care management

## Patient Resources & Portals

- [Physician Directory](https://acme.com/doctors): Search board-certified specialists by clinical field and hospital affiliation
- [Schedule Appointment](https://acme.com/appointments): Instant online clinic booking and secure telehealth video visits
- [Accepted Health Insurance](https://acme.com/billing/insurance): Comprehensive network guide for PPO, HMO, and Medicare coverage
- [Patient Health Records](https://acme.com/portal): Encrypted portal for laboratory bloodwork, imaging reports, and doctor messaging

## Optional

- [24/7 Urgent Care Centers](https://acme.com/urgent-care): Walk-in emergency clinic locations and live wait times
- [Active Clinical Trials](https://acme.com/research/trials): Institutional review board approved studies seeking qualified candidates
`,
  },
  {
    id: "legal",
    name: "Corporate Law & Attorney Practice",
    category: "Professional Services",
    description:
      "Corporate counsel, M&A, cross-border commercial transactions, and IP litigation",
    content: `# Acme Legal Partners LLP

> International corporate counsel, cross-border commercial transactions, intellectual property, and appellate litigation.

## Core Practice Groups

- [Corporate M&A & Private Equity](https://acme.com/practices/mergers-acquisitions): Cross-border acquisitions, joint ventures, and antitrust filings
- [Intellectual Property & Patents](https://acme.com/practices/intellectual-property): Patent prosecution, trademark enforcement, and licensing arbitration
- [Commercial Litigation & Trial](https://acme.com/practices/litigation): Complex contract disputes, breach of fiduciary duty, and international arbitration
- [Regulatory & Compliance](https://acme.com/practices/regulatory): SEC disclosure compliance, data privacy (GDPR/CCPA), and trade sanctions

## Client Engagement

- [Partner Directory](https://acme.com/attorneys): Partner biographies, bar admissions, published treatises, and notable verdicts
- [Schedule Legal Consultation](https://acme.com/consultation): Confidential conflict-checked intake evaluation with practice partners
- [Billing & Fee Structures](https://acme.com/about/fees): Structured hourly rates, value-based flat fee retainers, and escrow terms

## Optional

- [Representative Case Results](https://acme.com/case-results): Summary of major trial verdicts, arbitration awards, and transaction closures
- [Legal Briefs & Regulatory Alerts](https://acme.com/insights): In-depth legal analysis of appellate precedents and statutory changes
`,
  },
  {
    id: "finance",
    name: "Banking, Fintech & Wealth",
    category: "Finance",
    description:
      "Asset management, fiduciary private wealth planning, and treasury liquidity solutions",
    content: `# Acme Financial & Wealth Advisory

> Institutional asset management, fiduciary private wealth planning, and treasury liquidity solutions.

## Advisory & Wealth Solutions

- [Private Wealth Management](https://acme.com/wealth): Bespoke portfolio allocation, multi-asset diversification, and family office services
- [Institutional Treasury & Cash](https://acme.com/institutional/treasury): High-yield corporate treasury management, short-term debt, and repo facilities
- [Alternative Assets & Private Equity](https://acme.com/alternatives): Qualified purchaser access to direct infrastructure and venture funds
- [Tax Optimization & Estate Trusts](https://acme.com/wealth/estate-planning): Multi-generational wealth succession and charitable trust structuring

## Client Tools & Portal

- [Secure Custody Portal](https://acme.com/portal): Two-factor access to portfolio balances, daily gain/loss, and trade execution
- [Quarterly Market Outlook](https://acme.com/research/outlook): Macroeconomic analysis, yield curve forecasts, and equity valuations
- [Schedule Fiduciary Review](https://acme.com/advisory/consultation): Complimentary portfolio audit with a Certified Financial Planner (CFP)

## Optional

- [Regulatory ADV & Form CRS](https://acme.com/compliance/disclosures): SEC registration documents, fiduciary standards, and fee schedules
- [Asset Protection & SIPC Safeguards](https://acme.com/security): Custody insurance, excess SIPC protections, and encryption protocols
`,
  },
  {
    id: "realestate",
    name: "Commercial & Residential Real Estate",
    category: "Real Estate",
    description:
      "Institutional asset brokerage, commercial leasing, and luxury residential sales",
    content: `# Acme Commercial & Residential Real Estate

> Institutional asset brokerage, commercial office leasing, and luxury residential property sales.

## Brokerage & Property Listings

- [Featured Residential Properties](https://acme.com/listings/residential): Curated penthouses, private estates, and luxury developments
- [Commercial Office & Retail](https://acme.com/listings/commercial): Prime downtown class-A office towers, retail frontage, and flex industrial
- [Industrial & Logistics Parks](https://acme.com/listings/industrial): High-cube distribution warehouses and intermodal logistics hubs
- [Comparative Market Valuation](https://acme.com/tools/valuation): Automated valuation model and recent neighborhood sales analysis

## Client Services

- [Licensed Broker Directory](https://acme.com/agents): Regional broker specialists, past transaction volumes, and contact lines
- [Mortgage & Amortization Calculator](https://acme.com/tools/mortgage): Debt service coverage ratios and monthly payment estimates
- [Buyer's Due Diligence Guide](https://acme.com/guides/buying): Title insurance, environmental assessments, and escrow closing checklists

## Optional

- [Institutional Investor Syndicate](https://acme.com/investors): Direct access to core-plus real estate syndicates and private REITs
- [Weekend Open House Calendar](https://acme.com/open-houses): Scheduled property walkthroughs and private showings
`,
  },
  {
    id: "restaurant",
    name: "Restaurant, Dining & Hospitality",
    category: "Food & Dining",
    description:
      "Chef-driven dining establishments, farm-to-table menus, and sommelier cellars",
    content: `# Acme Hospitality Group & Restaurants

> Chef-driven dining establishments, farm-to-table seasonal gastronomy, and sommelier-curated cellars.

## Menus & Dining

- [Dinner Tasting Menu](https://acme.com/menus/dinner): Multi-course seasonal culinary menu with dry-aged meats and artisanal pasta
- [Wine Cellar & Reserve List](https://acme.com/menus/wine): Over 800 curated regional bottles, biodynamic producers, and rare vintages
- [Lunch & Business Prix-Fixe](https://acme.com/menus/lunch): Express two and three-course seasonal offerings for executive dining
- [Dietary & Allergen Guide](https://acme.com/menus/allergens): Detailed ingredient disclosures for gluten-free, dairy-free, and vegan diets

## Guest Reservations & Hospitality

- [Online Table Reservations](https://acme.com/reservations): Instant reservation bookings with private dining room requests
- [Private Banquets & Events](https://acme.com/events): Event spaces for corporate receptions, rehearsal dinners, and weddings
- [Dining Gift Cards](https://acme.com/gift-cards): Digital and physical gift cards valid across all hospitality group locations

## Optional

- [Hours & Valet Parking](https://acme.com/location): Operating hours, dress code, directions, and valet service guidelines
- [Purveyor & Farm Partners](https://acme.com/about/purveyors): Profiles of local organic agricultural partners and sustainable fisheries
`,
  },
  {
    id: "education",
    name: "University & EdTech Academy",
    category: "Education",
    description:
      "Accredited undergraduate curricula, graduate laboratories, and online certificates",
    content: `# Acme University & Online Academy

> Accredited undergraduate curricula, graduate research laboratories, and executive online certificates.

## Academic Divisions & Programs

- [Undergraduate Degrees](https://acme.com/academics/undergraduate): Computer science, biomedical engineering, finance, and humanities
- [Graduate & Doctoral Studies](https://acme.com/academics/graduate): Master of Science, MBA programs, and funded PhD research fellowships
- [Executive Online Certificates](https://acme.com/online): Accelerated 12-week professional courses in AI engineering and cloud architecture
- [Course Catalog & Syllabi](https://acme.com/catalog): Full semester schedules, prerequisite requirements, and professor directories

## Admissions & Student Services

- [Admissions & Application Portal](https://acme.com/admissions): Deadlines, standardized testing policies, and online application portal
- [Tuition & Financial Aid](https://acme.com/financial-aid): Need-based scholarships, research grants, and student loan programs
- [Virtual 3D Campus Tour](https://acme.com/campus-tour): Interactive walkthrough of student residences, research labs, and libraries

## Optional

- [Official Academic Calendar](https://acme.com/calendar): Term start dates, add/drop deadlines, examination periods, and commencement
- [Career Placement & Alumni Network](https://acme.com/careers): Graduate employment statistics, employer partnerships, and mentorship
`,
  },
  {
    id: "services",
    name: "Local Home & Trade Services",
    category: "Trades",
    description:
      "Mechanical, HVAC, electrical, and commercial plumbing contracting services",
    content: `# Acme Field & Commercial Services

> Certified mechanical, HVAC, electrical, and commercial plumbing contracting services.

## Contracting Solutions

- [Commercial & Residential HVAC](https://acme.com/services/hvac): Rooftop packaged units, chillers, heat pumps, and duct maintenance
- [Master Commercial Plumbing](https://acme.com/services/plumbing): Backflow prevention, hydro-jetting, boiler repair, and pipe relining
- [Industrial Electrical & EV Charging](https://acme.com/services/electrical): 480V switchgear, panel upgrades, and commercial EV fleets
- [Facility Preventive Maintenance](https://acme.com/services/maintenance): Scheduled quarterly inspections and compliance documentation

## Service Dispatch & Pricing

- [24/7 Emergency Dispatch](https://acme.com/emergency): Guaranteed 60-minute on-site response for urgent utility failures
- [Transparent Flat-Rate Pricing](https://acme.com/pricing): Upfront itemized quotes with no hidden overtime surcharges
- [Schedule In-Person Estimate](https://acme.com/book): Online booking system with confirmed arrival time windows

## Optional

- [Service Territory Coverage](https://acme.com/service-area): Regional zip code directory and emergency service boundaries
- [Licenses, Insurance & Bond Data](https://acme.com/about/licensing): State license registry numbers, general liability, and bonding
`,
  },
  {
    id: "agency",
    name: "Digital Product & Design Agency",
    category: "Professional Services",
    description:
      "Digital product strategy, enterprise design systems, and custom software engineering",
    content: `# Acme Interactive & Digital Product Studio

> Award-winning digital product strategy, enterprise design systems, and custom software engineering.

## Capabilities & Services

- [Product Design (UI/UX)](https://acme.com/services/design): User research, information architecture, interactive prototypes, and design systems
- [Full-Stack Engineering](https://acme.com/services/engineering): High-scale Next.js web applications, headless commerce, and cloud backends
- [Brand Identity & Strategy](https://acme.com/services/brand): Visual brand guidelines, typography standards, and brand positioning
- [Conversion Rate Optimization (CRO)](https://acme.com/services/growth): Funnel analytics, A/B testing architecture, and speed optimization

## Case Studies & Portfolio

- [Featured Client Case Studies](https://acme.com/work): Comprehensive project breakdowns with quantified business transformation metrics
- [Design Systems Showcase](https://acme.com/design-systems): Modular component libraries engineered for cross-platform scalability
- [Request Project Proposal](https://acme.com/contact): Project scoping questionnaire and discovery consultation intake

## Optional

- [Studio Culture & Careers](https://acme.com/careers): Remote engineering and design positions, benefits, and studio philosophy
- [Engineering & Design Journal](https://acme.com/journal): Articles on modern web architecture, accessibility, and typography
`,
  },
  {
    id: "oss",
    name: "Open Source Developer Tooling",
    category: "Technology",
    description:
      "High-performance systems software library and developer CLI tooling",
    content: `# Acme Open Source Core Library

> High-performance, memory-safe systems software library and developer CLI tooling.

## Documentation & Manuals

- [Installation & Quickstart](https://acme.com/docs/install): Package manager instructions (npm, Homebrew, Cargo, APT)
- [Configuration Specification](https://acme.com/docs/config): Complete schema definition, environment variables, and config flags
- [Core CLI Command Reference](https://acme.com/docs/cli): Subcommands, argument flags, exit codes, and shell completion
- [Contributing Guidelines](https://acme.com/docs/contributing): Pull request standards, code formatting, and local test suite setup

## Project Links & Source

- [GitHub Repository](https://github.com/acme/core): Public open source codebase, issue tracker, and pull requests
- [Release Notes & SemVer](https://acme.com/releases): Historical changelog, migration guides, and breaking change warnings
- [Community Discussion Forum](https://acme.com/community): Developer discussion board, RFCs, and maintainer office hours

## Optional

- [Performance Benchmarks](https://acme.com/benchmarks): Execution speed, CPU throughput, and memory consumption comparisons
- [Software License](https://acme.com/license): Official Apache 2.0 open source software license terms
`,
  },
  {
    id: "logistics",
    name: "Global Logistics & Freight",
    category: "Industrial",
    description:
      "Multimodal freight forwarding, intermodal rail transport, and bonded warehousing",
    content: `# Acme Global Freight & Logistics

> End-to-end multimodal freight forwarding, intermodal rail transport, and bonded warehousing networks.

## Freight & Supply Chain Solutions

- [Ocean Freight Forwarding](https://acme.com/services/ocean): FCL and LCL shipping, vessel chartering, and automated customs clearance
- [Air Freight Logistics](https://acme.com/services/air): Expedited air cargo, temperature-controlled pharma transport, and charters
- [Intermodal Rail & Drayage](https://acme.com/services/intermodal): Cross-country rail container transport and port drayage
- [Contract Warehousing & Fulfillment](https://acme.com/services/warehousing): WMS-integrated pick, pack, and palletized distribution

## Carrier Tools & Tracking

- [Global Shipment Tracking](https://acme.com/tracking): Live container GPS tracking and bill of lading lookup
- [Instant Freight Rate Calculator](https://acme.com/tools/quote): Real-time spot market quotes and seasonal surcharge estimation
- [Customs Compliance & Harmonized Tariffs](https://acme.com/customs): HTS code lookup, import declarations, and duty calculations

## Optional

- [Facility Network Directory](https://acme.com/facilities): Global warehouse square footage, crane capacities, and port access
- [Sustainability & Green Freight](https://acme.com/sustainability): Carbon-neutral shipping routes and alternative fuel vessel programs
`,
  },
  {
    id: "manufacturing",
    name: "Industrial Manufacturing & Equipment",
    category: "Industrial",
    description:
      "Precision CNC machining, sheet metal fabrication, and robotics automation",
    content: `# Acme Industrial Manufacturing & Automation

> Precision CNC machining, sheet metal fabrication, additive manufacturing, and robotics automation.

## Manufacturing Capabilities

- [Precision 5-Axis CNC Machining](https://acme.com/capabilities/cnc): High-tolerance titanium, aluminum, and stainless steel fabrication
- [Industrial Sheet Metal Fabrication](https://acme.com/capabilities/sheet-metal): Laser cutting, robotic press brake forming, and welding
- [Industrial 3D Printing (DMLS)](https://acme.com/capabilities/additive): Direct metal laser sintering for aerospace and medical prototypes
- [Quality Assurance & Metrology](https://acme.com/quality): CMM coordinate measuring machines, optical scanning, and ISO 9001:2015

## Engineering Support

- [Instant DFM Quote Engine](https://acme.com/quote): Upload CAD models (STEP/IGES) for automated manufacturability analysis
- [Materials Specification Guide](https://acme.com/materials): Tensile strength, hardness, and thermal properties for 70+ engineering alloys
- [Surface Finishing Catalog](https://acme.com/finishing): Anodizing, powder coating, passivation, electropolishing, and plating

## Optional

- [Certifications & Compliance](https://acme.com/certifications): AS9100D aerospace, ISO 13485 medical, and ITAR compliance registry
- [Equipment Inventory](https://acme.com/facilities/equipment): Complete list of machine centers, bed sizes, and laser wattages
`,
  },
  {
    id: "media",
    name: "News Publishing & Digital Media",
    category: "Media",
    description:
      "Investigative journalism, financial intelligence, and digital news syndication",
    content: `# Acme Media & Digital Publishing Network

> Independent investigative journalism, financial intelligence, multimedia podcasts, and digital news syndication.

## Editorial Desks & Publications

- [Business & Global Markets](https://acme.com/markets): Equities analysis, macroeconomic policy, commodities, and venture capital
- [Technology & Artificial Intelligence](https://acme.com/tech): Silicon Valley reporting, cloud software, hardware reviews, and AI ethics
- [Politics & Public Policy](https://acme.com/politics): Legislative reporting, regulatory scrutiny, and international geopolitical affairs
- [Special Investigative Reports](https://acme.com/investigations): Long-form investigative journalism and documented whistleblower leaks

## Syndication & Subscriptions

- [Acme Premium Membership](https://acme.com/subscribe): Unlimited ad-free access, daily executive newsletters, and subscriber events
- [API Content Syndication](https://acme.com/syndication): Real-time RSS and JSON newsfeeds for financial terminals and aggregators
- [Podcast & Audio Network](https://acme.com/podcasts): Daily morning news briefing and long-form interview series

## Optional

- [Editorial Ethics & Correction Policy](https://acme.com/about/ethics): Standards of fact-checking, anonymous source guidelines, and corrections
- [Masthead & Staff Directory](https://acme.com/masthead): Editorial leadership, bureau chiefs, and contributing columnists
`,
  },
  {
    id: "hospitality",
    name: "Hotels, Resorts & Travel",
    category: "Hospitality",
    description:
      "Destination resorts, luxury urban boutique hotels, and conference facilities",
    content: `# Acme Hotels & Luxury Resorts

> World-class destination resorts, luxury urban boutique hotels, and corporate conference facilities.

## Properties & Accommodations

- [Resort Destinations](https://acme.com/destinations): Oceanfront villas, alpine ski chalets, and private island retreats
- [Urban Boutique Hotels](https://acme.com/destinations/urban): Downtown architectural properties in major global financial capitals
- [Suites & Private Residences](https://acme.com/accommodations): Multi-bedroom penthouses with private plunge pools and dedicated butler service
- [Wellness & Luxury Spas](https://acme.com/wellness): Holistic thermal baths, restorative therapies, and private fitness pavilions

## Guest Experience & Booking

- [Reservations & Suite Availability](https://acme.com/booking): Real-time room booking with best-rate guarantees
- [Acme Loyalty Club](https://acme.com/loyalty): Tiered room upgrades, late checkout, and bespoke experiential rewards
- [Executive Conferences & Banquets](https://acme.com/meetings): Event facilities with cutting-edge audiovisual staging

## Optional

- [Concierge Services & Private Aviation](https://acme.com/concierge): Chauffeur transfers, yacht charters, and private aviation coordination
- [Dining & Michelin Partnerships](https://acme.com/dining): Overview of on-property restaurants and celebrity chef collaborations
`,
  },
  {
    id: "automotive",
    name: "Automotive Dealership & Fleet",
    category: "Automotive",
    description:
      "Electric vehicle manufacturing, fleet mobility, and dealership service networks",
    content: `# Acme Automotive & Fleet Mobility

> Electric vehicle manufacturing, autonomous fleet mobility, and nationwide dealership service networks.

## Vehicle Models & Technology

- [Electric Passenger Vehicles](https://acme.com/vehicles/electric): Long-range electric sedans, modular SUVs, and crossover models
- [Commercial Fleet Vans](https://acme.com/vehicles/fleet): High-efficiency electric delivery vans, flatbeds, and cargo chassis
- [Autonomous Drive Architecture](https://acme.com/technology/autonomy): Vision-based neural network compute, lidar fusion, and safety redundant systems
- [Powertrain & Battery Specifications](https://acme.com/technology/battery): 800V silicon-carbide architecture, bidirectional V2G, and charging curves

## Customer & Fleet Ownership

- [Schedule Test Drive](https://acme.com/test-drive): Book an automated or dealer test drive at regional mobility hubs
- [Supercharging Network](https://acme.com/charging): Interactive map of 350kW DC fast-charging plazas across highway corridors
- [Service Center Directory](https://acme.com/service): Certified maintenance locations, mobile technician dispatch, and collision repair
- [Fleet Management Portal](https://acme.com/fleet): Enterprise telematics, vehicle health monitoring, and fleet charging schedule

## Optional

- [Vehicle Software Updates](https://acme.com/updates): Over-the-air (OTA) firmware release notes and newly unlocked features
- [Warranty & Battery Guarantee](https://acme.com/warranty): 8-year/100,000-mile battery capacity retention warranty terms
`,
  },
  {
    id: "insurance",
    name: "Insurance & Risk Underwriting",
    category: "Finance",
    description:
      "Commercial liability, cyber risk, professional indemnity, and property underwriting",
    content: `# Acme Mutual Underwriting & Insurance

> Commercial liability, professional indemnity, commercial property, and group healthcare underwriting.

## Coverage Lines

- [Commercial General Liability](https://acme.com/coverage/general-liability): Property damage, bodily injury, and commercial defense coverage
- [Cyber Risk & Data Breach](https://acme.com/coverage/cyber): Ransomware response, business interruption, and forensic investigation costs
- [Directors & Officers (D&O)](https://acme.com/coverage/directors-officers): Defense coverage against fiduciary breach and shareholder lawsuits
- [Commercial Property & Inland Marine](https://acme.com/coverage/property): Comprehensive coverage for physical structures, machinery, and goods in transit

## Policyholders & Claims

- [File a Claim Online](https://acme.com/claims): 24/7 digital claim filing with direct adjuster assignment and progress tracking
- [Policyholder Self-Service Portal](https://acme.com/portal): Download Certificates of Insurance (COI) and make premium payments
- [Request Commercial Quote](https://acme.com/quote): Underwriting intake questionnaire for customized enterprise coverage

## Optional

- [Financial Strength Ratings](https://acme.com/about/ratings): A.M. Best 'A+' (Superior) and S&P financial solvency ratings
- [Risk Mitigation & Loss Control](https://acme.com/risk-control): Workplace safety protocols, OSHA compliance guides, and cyber audit tools
`,
  },
  {
    id: "nonprofit",
    name: "Non-Profit & Global Foundation",
    category: "Non-Profit",
    description:
      "International humanitarian assistance, crisis response, and clean water initiatives",
    content: `# Acme Global Relief Foundation

> International humanitarian assistance, disaster crisis response, and sustainable clean water initiatives.

## Core Humanitarian Missions

- [Emergency Disaster Relief](https://acme.com/programs/disaster-relief): Rapid deployment of emergency food supplies, medical kits, and temporary shelter
- [Clean Water & Sanitation (WASH)](https://acme.com/programs/clean-water): Deep-well drilling, solar water purifiers, and hygiene education
- [Community Healthcare Clinics](https://acme.com/programs/healthcare): Mobile medical clinics providing pediatric vaccinations and maternal health
- [Primary Education Infrastructure](https://acme.com/programs/education): School construction, learning supplies, and teacher training programs

## Donor Transparency & Impact

- [Make a Tax-Deductible Donation](https://acme.com/donate): Secure recurring monthly giving and single donation processing
- [Annual Financial & Impact Report](https://acme.com/transparency): Audited financial statements, Form 990 filings, and overhead efficiency ratios
- [Volunteer & Field Missions](https://acme.com/volunteer): Applications for medical personnel, logistics volunteers, and local chapters

## Optional

- [Charity Navigator 4-Star Rating](https://acme.com/about/accreditations): Independent charity watchdog scores and GuideStar Platinum seal
- [Field Mission Dispatch Blog](https://acme.com/news): Weekly dispatches from relief workers on the ground in crisis regions
`,
  },
  {
    id: "recruiting",
    name: "Executive Search & Staffing",
    category: "Professional Services",
    description:
      "Retained executive search, technical leadership recruiting, and talent advisory",
    content: `# Acme Executive Search & Talent Partners

> Retained executive search, technical leadership recruiting, and global talent advisory.

## Practice Areas

- [Executive Search (C-Suite & Board)](https://acme.com/practices/executive-search): Chief Executive, CTO, CFO, and independent director placements
- [Technology & Engineering Search](https://acme.com/practices/engineering): Principal software engineers, VP of Engineering, and AI researchers
- [Life Sciences & Biotechnology](https://acme.com/practices/life-sciences): Chief Medical Officers, clinical directors, and regulatory specialists
- [Private Equity Human Capital](https://acme.com/practices/private-equity): Operating partner placements and portfolio company leadership

## Candidate & Client Services

- [Active Executive Opportunities](https://acme.com/opportunities): Confidential senior leadership listings and application guidelines
- [Submit Executive Resume](https://acme.com/candidates/submit): Confidential candidate network intake for future search engagements
- [Client Search Engagement Process](https://acme.com/clients/process): Overview of candidate vetting, psychological assessments, and placement guarantee

## Optional

- [Executive Compensation Benchmark](https://acme.com/research/compensation): Annual study on C-suite base salaries, equity packages, and bonuses
- [Leadership Advisory Articles](https://acme.com/insights): Thought leadership on succession planning and remote organizational design
`,
  },
  {
    id: "security",
    name: "Cybersecurity & Threat Defense",
    category: "Technology",
    description:
      "Managed detection & response (MDR), red team testing, and cloud security",
    content: `# Acme Cyber Defense & Threat Intelligence

> Managed detection and response (MDR), penetration testing, and zero-trust cloud security architecture.

## Cyber Security Services

- [Managed Detection & Response (MDR)](https://acme.com/services/mdr): 24/7 Security Operations Center (SOC) monitoring and threat hunting
- [Red Team & Penetration Testing](https://acme.com/services/penetration-testing): Adversary emulation, web app assessments, and physical security audits
- [Cloud Security Posture (CSPM)](https://acme.com/services/cloud-security): Multi-cloud misconfiguration auditing across AWS, Azure, and GCP
- [Incident Response & Forensics](https://acme.com/services/incident-response): Rapid digital forensics, ransomware containment, and regulatory reporting

## Security Resources

- [Emergency Breach Hotline](https://acme.com/emergency): 24/7 hotline for active ransomware outbreaks and cyber emergencies
- [Weekly Threat Intelligence Brief](https://acme.com/threat-intelligence): Technical indicators of compromise (IoCs) and zero-day vulnerability analysis
- [Schedule Security Assessment](https://acme.com/contact/assessment): Comprehensive initial cyber posture evaluation with certified CISSPs

## Optional

- [Security Certifications](https://acme.com/certifications): CREST accredited, SOC 2 Type II certified, and FedRAMP authorized
- [Vulnerability Research & Advisories](https://acme.com/advisories): Coordinated disclosure reports and CVE publications
`,
  },
  {
    id: "energy",
    name: "Clean Energy & Solar Utilities",
    category: "Energy",
    description:
      "Utility solar generation, grid battery storage, and carbon-free commercial energy",
    content: `# Acme Clean Energy & Solar Grid

> Utility-scale solar power generation, grid battery storage, and carbon-free commercial energy delivery.

## Clean Energy Infrastructure

- [Utility Solar Generation](https://acme.com/generation/solar): Multi-gigawatt utility solar arrays and high-efficiency photovoltaic plants
- [Grid-Scale Battery Storage](https://acme.com/generation/storage): Lithium iron phosphate (LFP) megawatt-hour energy storage installations
- [Commercial & Industrial Solar](https://acme.com/commercial): Rooftop solar arrays and microgrid systems for factories and corporate parks
- [Virtual Power Plants (VPP)](https://acme.com/generation/vpp): Distributed smart battery aggregation for grid peak-shaving

## Customers & Energy Delivery

- [Corporate Renewable PPAs](https://acme.com/ppa): Long-term Power Purchase Agreements with fixed clean energy pricing
- [Commercial Energy Audit](https://acme.com/tools/energy-audit): Algorithmic facility energy consumption analysis and solar ROI calculator
- [Customer Account Portal](https://acme.com/portal): Real-time kilowatt-hour monitoring, invoice billing, and renewable energy certificates (RECs)

## Optional

- [Real-Time Generation Dashboard](https://acme.com/grid-status): Live megawatts generated, battery state of charge, and avoided CO2 emissions
- [Interconnection & Grid Studies](https://acme.com/engineering): Engineering whitepapers on inverter stability and transmission interconnection
`,
  },
  {
    id: "telecom",
    name: "Telecom & Fiber Infrastructure",
    category: "Infrastructure",
    description:
      "Ultra-low latency fiber optics, enterprise Ethernet, and cloud interconnects",
    content: `# Acme Telecom & Fiber Networks

> Ultra-low latency fiber optic backbones, dedicated enterprise Ethernet, and cloud interconnects.

## Enterprise Connectivity

- [Dedicated Internet Access (DIA)](https://acme.com/services/dia): Symmetrical gigabit and 100G fiber connections with 99.999% SLA guarantees
- [Dark Fiber & Wavelengths](https://acme.com/services/wavelengths): Dense Wavelength Division Multiplexing (DWDM) between data centers
- [Direct Cloud Interconnects](https://acme.com/services/cloud-connect): Private layer 2/3 links to AWS Direct Connect, Azure ExpressRoute, and GCP
- [Managed SD-WAN Services](https://acme.com/services/sd-wan): Zero-trust software-defined wide area networking for branch offices

## Network Operations

- [Interactive Fiber Map](https://acme.com/network-map): On-net building directory, metro rings, and long-haul fiber routes
- [Service Level Agreement (SLA)](https://acme.com/sla): Latency, packet loss, and jitter commitments with automatic credit penalties
- [Network Operations Center (NOC)](https://acme.com/support/noc): 24/7/365 tier-3 engineering support desk and circuit diagnostics

## Optional

- [Looking Glass & Speed Test](https://acme.com/tools/looking-glass): Public BGP route tables, ping diagnostics, and traceroute nodes
- [Planned Maintenance Schedule](https://acme.com/maintenance): Upcoming fiber splicing notices and non-disruptive hardware upgrades
`,
  },
  {
    id: "agriculture",
    name: "AgriTech & Crop Science",
    category: "Agriculture",
    description:
      "Autonomous agricultural robotics, drone imagery, and IoT soil sensor networks",
    content: `# Acme AgriTech & Precision Farming

> Autonomous agricultural robotics, multispectral drone imagery, and IoT soil sensor networks.

## Smart Agriculture Systems

- [Soil IoT Sensor Telemetry](https://acme.com/products/soil-sensors): Sub-surface moisture, nitrogen, phosphorus, and potassium (NPK) sensors
- [Precision Irrigation Systems](https://acme.com/products/irrigation): Automated variable-rate irrigation controllers tied to satellite weather models
- [Multispectral Crop Health Imagery](https://acme.com/services/crop-health): Normalized Difference Vegetation Index (NDVI) mapping via drones
- [Farm Management Software](https://acme.com/software): Yield forecasting, input inventory tracking, and machinery telematics

## Grower Resources & Pricing

- [Agronomic Consultation](https://acme.com/consultation): Field appointments with certified professional agronomists
- [Hardware Pricing & Packages](https://acme.com/pricing): Equipment packages for small farms, commercial orchards, and enterprise growers
- [Grower Cloud Portal](https://acme.com/portal): Live field sensor telemetry dashboard and automated harvest timeline projection

## Optional

- [University Trial Data](https://acme.com/research/trials): Independent university research studies verifying water reduction and yield increases
- [Equipment Warranty & Field Support](https://acme.com/support): 3-year outdoor hardware replacement warranty and field service technicians
`,
  },
  {
    id: "biotech",
    name: "BioSciences & Clinical Research",
    category: "Medical",
    description:
      "Targeted molecular oncology therapeutics, mRNA platforms, and drug discovery",
    content: `# Acme BioSciences & Clinical Therapeutics

> Targeted molecular oncology therapeutics, mRNA platform technologies, and genomic drug discovery.

## Therapeutic Pipelines

- [Targeted Small Molecule Oncology](https://acme.com/pipeline/oncology): Kinase inhibitors and selective protein degraders in phase II clinical trials
- [mRNA Vaccine Technologies](https://acme.com/pipeline/mrna): Next-generation lipid nanoparticle delivery systems for infectious diseases
- [Gene Editing & CRISPR Platforms](https://acme.com/pipeline/gene-therapy): Ex-vivo cellular therapeutics for rare monogenic hematological diseases
- [Preclinical Research Programs](https://acme.com/pipeline/preclinical): Lead candidate identification and pharmacokinetics evaluation

## Scientific Publications & Investors

- [Peer-Reviewed Publications](https://acme.com/publications): Scientific papers published in Nature, Science, and The Lancet
- [Active Clinical Trials Registry](https://acme.com/trials): Protocol details, patient inclusion criteria, and trial sites
- [Investor Relations & SEC Filings](https://acme.com/investors): Quarterly financial earnings, Form 10-K filings, and corporate presentations

## Optional

- [Scientific Advisory Board](https://acme.com/about/scientific-board): Nobel laureates and academic oncology department chairs
- [Corporate Partnering](https://acme.com/partnering): Inquiries for co-development, out-licensing, and academic research collaborations
`,
  },
  {
    id: "government",
    name: "Municipal Civic Portal",
    category: "Government",
    description:
      "Official digital civic services, municipal public records, and permitting",
    content: `# Acme City Civic Services & Municipal Portal

> Official digital services portal, municipal public records, civic council proceedings, and citizen assistance.

## Public Services & Permitting

- [Residential Building Permits](https://acme.com/permits): Apply online for electrical, plumbing, structural, and solar building permits
- [Business Licensing & Registration](https://acme.com/business-license): Commercial business filings, tax registration, and annual renewals
- [Property Tax Payments](https://acme.com/taxes): Real estate parcel lookup, tax assessment records, and online bill payments
- [Trash, Recycling & Utilities](https://acme.com/utilities): Municipal water service setup, recycling schedules, and hazardous waste drop-off

## City Governance & Civic Affairs

- [City Council Agenda & Minutes](https://acme.com/council): Public meeting schedules, broadcast livestreams, and legislative voting records
- [Public Records Request (FOIA)](https://acme.com/records): Online portal for submitting freedom of information requests
- [Report a Civic Issue (311)](https://acme.com/311): Report potholes, broken streetlights, or code violations for municipal dispatch

## Optional

- [Parks & Community Recreation](https://acme.com/parks): Public park reservations, youth sports leagues, and community center calendars
- [Emergency Civic Alert System](https://acme.com/alerts): Register for SMS emergency alerts regarding weather, road closures, and boil water notices
`,
  },
];

export function personalizeTemplate(content: string, domain: string): string {
  if (!domain || !content) return content;
  const clean = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
  if (!clean || clean === "acme.com") return content;

  const rawBrand = clean.split(".")[0] || "acme";
  const brand = rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1);

  return content
    .replace(/https:\/\/acme\.com/g, `https://${clean}`)
    .replace(/acme\.com/g, clean)
    .replace(/Acme Corp/g, `${brand} Corp`)
    .replace(/Acme Corporation/g, `${brand} Corporation`)
    .replace(/Acme/g, brand);
}

/**
 * Dynamically fetches the latest template directory from the Linten Cloud API.
 * If the cloud adds more templates in the future, this picks them up automatically.
 * Falls back to built-in templates if offline or before endpoint is deployed.
 */
export async function fetchCloudTemplates(): Promise<CloudTemplate[]> {
  try {
    const res = await fetch(`${LINTEN_CLOUD_BASE}/api/v1/templates`, {
      method: "GET",
      headers: {
        "User-Agent": "Linten-Raycast/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        return data.templates;
      }
    }
  } catch {
    // Graceful fallback to built-in cloud catalog
  }

  return BUILTIN_CLOUD_TEMPLATES;
}
